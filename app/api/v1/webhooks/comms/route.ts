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

    // Process inbound WhatsApp messages for active test runs (flow engine)
    if (payload.event === 'message.received' && payload.incoming?.body) {
      // Strip whatsapp: prefix to get raw phone number
      const fromPhone = (payload.incoming.from || '').replace(/^whatsapp:/, '');
      const body = payload.incoming.body;

      if (fromPhone) {
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
