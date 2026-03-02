/**
 * GET   /api/v1/inbox/conversations/:id — Get a single conversation
 * PATCH /api/v1/inbox/conversations/:id — Update status or priority
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getConversation, updateConversationStatus, updateConversationPriority } from '@/services/inbox/inbox.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { conversationId } = await params;
  const result = await getConversation(userResult.data.org_id, conversationId);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function PATCH(
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

    if (body.status) {
      const result = await updateConversationStatus(userResult.data.org_id, conversationId, body.status);
      if (!result.success) {
        return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
      }
      return NextResponse.json(toApiResponse(result));
    }

    if (body.priority) {
      const result = await updateConversationPriority(userResult.data.org_id, conversationId, body.priority);
      if (!result.success) {
        return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
      }
      return NextResponse.json(toApiResponse(result));
    }

    return NextResponse.json(
      toApiResponse(failure('VALIDATION_ERROR', 'No valid fields to update')),
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to update conversation')),
      { status: 500 }
    );
  }
}
