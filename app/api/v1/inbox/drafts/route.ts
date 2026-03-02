/**
 * GET /api/v1/inbox/drafts — Get draft for a conversation
 * PUT /api/v1/inbox/drafts — Save/update draft for a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { getDraft, saveDraft } from '@/services/inbox/preferences.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { searchParams } = request.nextUrl;
  const conversationSid = searchParams.get('conversation_sid');
  const isNote = searchParams.get('is_note') === 'true';

  if (!conversationSid) {
    return NextResponse.json(
      toApiResponse(failure('VALIDATION_ERROR', 'conversation_sid query param is required')),
      { status: 400 }
    );
  }

  const result = await getDraft(userResult.data.id, conversationSid, isNote);
  if (!result.success) {
    return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
  }

  return NextResponse.json(toApiResponse(result));
}

export async function PUT(request: NextRequest) {
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

    const result = await saveDraft(
      userResult.data.id,
      userResult.data.org_id,
      body.conversation_sid,
      body.content || '',
      body.channel || null,
      body.is_note || false
    );
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result));
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to save draft')),
      { status: 500 }
    );
  }
}
