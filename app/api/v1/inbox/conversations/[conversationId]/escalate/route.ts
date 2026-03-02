/**
 * POST /api/v1/inbox/conversations/:id/escalate — Escalate conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { escalateConversation } from '@/services/inbox/inbox.service';
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

    if (!body.agent_id) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'Agent ID is required for escalation')),
        { status: 400 }
      );
    }

    const result = await escalateConversation(
      userResult.data.org_id,
      conversationId,
      body.agent_id,
      body.reason
    );
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result));
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to escalate conversation')),
      { status: 500 }
    );
  }
}
