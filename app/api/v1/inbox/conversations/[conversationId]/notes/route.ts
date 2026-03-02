/**
 * GET  /api/v1/inbox/conversations/:id/notes — List internal notes
 * POST /api/v1/inbox/conversations/:id/notes — Create internal note
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { listNotes, createNote } from '@/services/inbox/inbox.service';
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
  const result = await listNotes(userResult.data.org_id, conversationId);
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

    if (!body.content?.trim()) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'Note content is required')),
        { status: 400 }
      );
    }

    const result = await createNote(userResult.data.org_id, conversationId, userResult.data.id, body.content);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to create note')),
      { status: 500 }
    );
  }
}
