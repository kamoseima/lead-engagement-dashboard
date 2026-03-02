/**
 * GET    /api/v1/inbox/pins — Get pinned conversation SIDs
 * POST   /api/v1/inbox/pins — Pin a conversation
 * DELETE /api/v1/inbox/pins — Unpin a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getPinnedConversations, pinConversation, unpinConversation } from '@/services/inbox/preferences.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET() {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const result = await getPinnedConversations(userResult.data.id);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function POST(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = await request.json();
    if (!body.conversation_sid) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'conversation_sid is required')),
        { status: 400 }
      );
    }

    const result = await pinConversation(userResult.data.id, userResult.data.org_id, body.conversation_sid);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to pin conversation')),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  try {
    const body = await request.json();
    if (!body.conversation_sid) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'conversation_sid is required')),
        { status: 400 }
      );
    }

    const result = await unpinConversation(userResult.data.id, body.conversation_sid);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result));
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to unpin conversation')),
      { status: 500 }
    );
  }
}
