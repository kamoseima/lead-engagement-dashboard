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
import type { TestRun } from '@/types/database';

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
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();

    // Verify HMAC signature if secret is configured
    if (WEBHOOK_SECRET) {
      const signature = request.headers.get('x-webhook-signature');
      if (!signature || !verifySignature(rawBody, signature, WEBHOOK_SECRET)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload: CommsWebhookPayload = JSON.parse(rawBody);

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
      const body =
        payload.incoming.whatsapp?.buttonReply?.title ||
        payload.incoming.whatsapp?.buttonText ||
        payload.incoming.whatsapp?.listReply?.title ||
        payload.templateResponse?.buttonReply?.title ||
        payload.templateResponse?.listReply?.title ||
        payload.incoming.body ||
        '';

      console.log(`[webhook] Inbound for flow engine: event=${payload.event} from=${fromPhone} body="${body.substring(0, 60)}"`);

      if (fromPhone && body) {
        try {
          await handleInboundForTests(fromPhone, body);
        } catch (err) {
          console.error('[webhook] Error processing inbound for test runs:', err);
        }
      }
    }

    // Acknowledge immediately — the comms platform expects 200
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('[webhook] Failed to process comms callback', error);
    return NextResponse.json({ received: true, error: 'Processing error' }, { status: 200 });
  }
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
