/**
 * POST /api/v1/inbox/conversations/:id/snooze — Snooze conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { snoozeConversation } from '@/services/inbox/inbox.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const { conversationId } = await params;
    const body = await request.json();

    if (!body.snooze_until) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'snooze_until is required')),
        { status: 400 }
      );
    }

    const result = await snoozeConversation(userResult.data.org_id, conversationId, body.snooze_until);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result));
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to snooze conversation')),
      { status: 500 }
    );
  }
}
