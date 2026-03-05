/**
 * GET  /api/v1/inbox/conversations/:id/messages — Get message timeline
 * POST /api/v1/inbox/conversations/:id/messages — Send agent message
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getTimeline, sendMessage, updateConversationStatus } from '@/services/inbox/inbox.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { conversationId } = await params;
  const { searchParams } = request.nextUrl;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : undefined;
  const pageToken = searchParams.get('pageToken') || undefined;

  const result = await getTimeline(userResult.data.org_id, conversationId, limit, pageToken);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

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

    if (!body.body?.trim()) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'Message body is required')),
        { status: 400 }
      );
    }

    const result = await sendMessage(
      userResult.data.org_id,
      conversationId,
      body.body,
      userResult.data.id,
      body.attributes
    );
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    // Update conversation status to waiting_on_customer after agent sends a message
    await updateConversationStatus(userResult.data.org_id, conversationId, 'waiting_on_customer').catch(() => {});

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to send message')),
      { status: 500 }
    );
  }
}
