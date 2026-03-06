/**
 * Comms Platform Tenant Callback Webhook
 *
 * POST /api/v1/webhooks/comms
 *
 * Receives real-time events from the comms platform:
 * - message.received  — inbound email/SMS/WhatsApp
 * - message.sent       — outbound message accepted
 * - message.delivered  — outbound message delivered
 * - message.failed     — outbound message failed
 * - message.bounced    — email bounced
 *
 * Security:
 * - HMAC-SHA256 signature verification via X-Webhook-Signature header
 * - Secret must match COMMS_WEBHOOK_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { processInboundForTestRun } from '@/services/testing/flow-engine.service';
import { recordActivity } from '@/services/leads/lead.service';
import type { TestRun, WebhookProcessingResult, ActivityType } from '@/types/database';

// ============================================================================
// CONFIGURATION
// ============================================================================

const WEBHOOK_SECRET = process.env.COMMS_WEBHOOK_SECRET ?? '';

// ============================================================================
// TYPES
// ============================================================================

interface CommsWebhookPayload {
  event: string;
  timestamp: string;
  message: {
    id: string;
    provider_message_id: string;
    channel: 'email' | 'sms' | 'whatsapp';
    provider: 'twilio' | 'sendgrid';
    recipient: string;
    status: string;
    customer_id?: string;
    conversation_id?: string;
    contact_conversation_id?: string;
  };
  conversation?: {
    id: string;
    contact_conversation_id: string;
    status: string;
    created: boolean;
    reopened: boolean;
  };
  incoming?: {
    from: string;
    body: string;
    media?: Array<{ url: string; contentType: string }>;
    whatsapp?: {
      buttonReply?: { id: string; title: string };
      buttonPayload?: string;
      buttonText?: string;
      listReply?: { id: string; title: string; description?: string };
    };
  };
  templateResponse?: {
    responseType: 'button' | 'list' | 'flow';
    buttonReply?: { id: string; title: string };
    listReply?: { id: string; title: string; description?: string };
  };
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
}

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;

  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  if (expected.length !== signature.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, 'utf-8'), Buffer.from(signature, 'utf-8'));
  } catch {
    return false;
  }
}

// ============================================================================
// POST HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const sourceIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify HMAC signature if secret is configured
    let signatureValid = !WEBHOOK_SECRET; // true if no secret configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature');
      signatureValid = !!signature && verifySignature(rawBody, signature, WEBHOOK_SECRET);
      if (!signatureValid) {
        logWebhookEvent({
          org_id: null,
          event_type: 'unknown',
          channel: null,
          payload: {},
          source_ip: sourceIp,
          signature_valid: false,
          processing_result: 'error',
          error: 'Invalid HMAC signature',
        });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: CommsWebhookPayload = JSON.parse(rawBody);

    // Fire-and-forget: log webhook event to database
    logWebhookEvent({
      org_id: null,
      event_type: payload.event,
      channel: payload.message.channel,
      payload: payload as unknown as Record<string, unknown>,
      source_ip: sourceIp,
      signature_valid: signatureValid,
      processing_result: 'success',
      error: null,
    });

    // Log for visibility (Vercel function logs)
    console.log(`[webhook] ${payload.event}`, {
      messageId: payload.message.id,
      channel: payload.message.channel,
      status: payload.message.status,
      ...(payload.incoming && { from: payload.incoming.from }),
      ...(payload.conversation && {
        conversationId: payload.conversation.id,
        created: payload.conversation.created,
      }),
    });

    // Process inbound WhatsApp messages for active test runs (flow engine).
    // The platform fires different event types depending on how the user replied:
    //   - message.received        — plain text reply
    //   - template.button_clicked — quick-reply or CTA button tap
    //   - template.list_selected  — list-picker item selection
    const inboundEvents = ['message.received', 'template.button_clicked', 'template.list_selected'];
    if (inboundEvents.includes(payload.event) && payload.incoming) {
      const fromPhone = (payload.incoming.from || '').replace(/^whatsapp:/, '');

      // For button clicks / list selections, prefer the interactive reply title over body.
      // Quick-reply buttons use buttonText (display label), while interactive buttons use buttonReply.title.
      // The body field often contains the button payload ID (e.g. "yes_plans") instead of the title.
      const rawText =
        payload.incoming.whatsapp?.buttonReply?.title ||
        payload.incoming.whatsapp?.buttonText ||
        payload.incoming.whatsapp?.listReply?.title ||
        payload.templateResponse?.buttonReply?.title ||
        payload.templateResponse?.listReply?.title ||
        payload.incoming.body ||
        '';
      // Twilio sends form-urlencoded data where spaces become '+'.
      // Some fields may retain literal '+' signs if not fully decoded upstream.
      const body = rawText.replace(/\+/g, ' ');

      console.log(`[webhook] Inbound for flow engine: event=${payload.event} from=${fromPhone} body="${body.substring(0, 60)}"`);

      if (fromPhone && body) {
        try {
          await handleInboundForTests(fromPhone, body);
        } catch (err) {
          console.error('[webhook] Error processing inbound for test runs:', err);
        }
      }
    }

    // Track lead activity for scoring (fire-and-forget)
    trackLeadActivity(payload);

    // Acknowledge immediately — the comms platform expects 200
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[webhook] Failed to process comms callback', error);
    return NextResponse.json({ received: true, error: 'Processing error' }, { status: 200 });
  }
}

// ============================================================================
// LEAD ACTIVITY TRACKING — Fire-and-forget scoring events
// ============================================================================

const EVENT_TO_ACTIVITY: Record<string, ActivityType> = {
  'message.delivered': 'delivered',
  'message.failed': 'failed',
  'message.bounced': 'bounced',
  'message.received': 'replied',
  'template.button_clicked': 'clicked',
  'template.list_selected': 'clicked',
};

function trackLeadActivity(payload: CommsWebhookPayload) {
  const activityType = EVENT_TO_ACTIVITY[payload.event];
  if (!activityType) return;

  (async () => {
    try {
      const supabase = createAdminClient();
      const phone = payload.incoming?.from?.replace(/^whatsapp:/, '')
        || payload.message.recipient?.replace(/^whatsapp:/, '')
        || '';
      if (!phone) return;

      // Resolve org_id from campaign_sends
      let orgId: string | null = null;
      if (payload.message.provider_message_id) {
        const { data: send } = await supabase
          .from('campaign_sends')
          .select('org_id, campaign_id, lead_name')
          .eq('provider_message_id', payload.message.provider_message_id)
          .limit(1)
          .maybeSingle();
        if (send) {
          orgId = send.org_id;
          await recordActivity(
            send.org_id,
            phone,
            activityType,
            'campaign',
            send.campaign_id,
            send.lead_name || undefined
          );
          return;
        }
      }

      // If we couldn't resolve via campaign_sends, try test_runs
      const phoneVariants = [phone];
      if (phone.startsWith('+')) phoneVariants.push(phone.slice(1));
      else phoneVariants.push(`+${phone}`);

      const { data: testRun } = await supabase
        .from('test_runs')
        .select('org_id, id, lead_name')
        .in('lead_phone', phoneVariants)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (testRun) {
        await recordActivity(
          testRun.org_id,
          phone,
          activityType,
          'test',
          testRun.id,
          testRun.lead_name || undefined
        );
      }
    } catch (err) {
      console.error('[webhook] Failed to track lead activity:', err);
    }
  })();
}

// ============================================================================
// WEBHOOK EVENT LOGGING — Fire-and-forget database insert
// ============================================================================

interface WebhookEventInsert {
  org_id: string | null;
  event_type: string;
  channel: string | null;
  payload: Record<string, unknown>;
  source_ip: string | null;
  signature_valid: boolean;
  processing_result: WebhookProcessingResult;
  error: string | null;
}

function logWebhookEvent(event: WebhookEventInsert) {
  // Fire-and-forget — don't await, swallow errors
  (async () => {
    try {
      const supabase = createAdminClient();

      // Attempt to resolve org_id from campaign_sends if we have a provider_message_id
      let orgId = event.org_id;
      const messageId = (event.payload as Record<string, unknown>)?.message &&
        ((event.payload as Record<string, unknown>).message as Record<string, unknown>)?.provider_message_id;
      if (!orgId && messageId) {
        const { data: send } = await supabase
          .from('campaign_sends')
          .select('org_id')
          .eq('provider_message_id', messageId as string)
          .limit(1)
          .maybeSingle();
        if (send) orgId = send.org_id;
      }

      await supabase.from('webhook_events').insert({
        org_id: orgId,
        event_type: event.event_type,
        channel: event.channel,
        payload: event.payload,
        source_ip: event.source_ip,
        signature_valid: event.signature_valid,
        processing_result: event.processing_result,
        error: event.error,
      });
    } catch (err) {
      console.error('[webhook-log] Failed to log event:', err);
    }
  })();
}

// ============================================================================
// FLOW ENGINE — Process inbound messages for active test runs
// ============================================================================

async function handleInboundForTests(fromPhone: string, body: string) {
  const supabase = createAdminClient();

  // Find active test runs waiting for a reply from this phone number.
  // Match both with and without country code prefix variations.
  const phoneVariants = [fromPhone];
  if (fromPhone.startsWith('+')) phoneVariants.push(fromPhone.slice(1));
  else phoneVariants.push(`+${fromPhone}`);

  const { data: activeRuns } = await supabase
    .from('test_runs')
    .select('*')
    .eq('status', 'waiting_reply')
    .in('lead_phone', phoneVariants)
    .not('flow_state', 'is', null)
    .order('started_at', { ascending: false })
    .limit(5);

  if (!activeRuns || activeRuns.length === 0) {
    console.log(`[webhook] No active test runs for ${fromPhone}`);
    return;
  }

  // Process the most recent active run
  const testRun = activeRuns[0] as TestRun;
  console.log(`[webhook] Routing inbound "${body}" to test run ${testRun.id}`);

  const result = await processInboundForTestRun(testRun, body);
  console.log(`[webhook] Flow engine result:`, result);
}
