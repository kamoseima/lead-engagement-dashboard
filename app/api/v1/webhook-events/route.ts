/**
 * Webhook Events API
 *
 * GET /api/v1/webhook-events — List webhook events with filters and pagination.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { listWebhookEvents } from '@/services/webhooks/webhook-event.service';
import { toApiResponse, mapErrorToHttpStatus } from '@/lib/shared/result';

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(
      toApiResponse(userResult),
      { status: mapErrorToHttpStatus(userResult.error.code) }
    );
  }

  const url = new URL(request.url);
  const filters = {
    event_type: url.searchParams.get('event_type') ?? undefined,
    channel: url.searchParams.get('channel') ?? undefined,
    processing_result: url.searchParams.get('status') ?? undefined,
    from_date: url.searchParams.get('from') ?? undefined,
    to_date: url.searchParams.get('to') ?? undefined,
    page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
    page_size: url.searchParams.get('page_size') ? parseInt(url.searchParams.get('page_size')!) : undefined,
  };

  const result = await listWebhookEvents(userResult.data.org_id, filters);
  if (!result.success) {
    return NextResponse.json(
      toApiResponse(result),
      { status: mapErrorToHttpStatus(result.error.code) }
    );
  }

  return NextResponse.json(toApiResponse(result));
}
