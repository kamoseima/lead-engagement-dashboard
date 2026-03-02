/**
 * GET  /api/v1/inbox/conversations — List conversations with filters
 * POST /api/v1/inbox/conversations — Get or create a conversation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/roles';
import { listConversations, getOrCreateConversation } from '@/services/inbox/inbox.service';
import { toApiResponse, mapErrorToHttpStatus, failure } from '@/lib/shared/result';
import type { ConversationListQuery } from '@/types/inbox';

export async function GET(request: NextRequest) {
  const userResult = await getCurrentUser();
  if (!userResult.success) {
    return NextResponse.json(toApiResponse(userResult), { status: mapErrorToHttpStatus(userResult.error.code) });
  }

  const { searchParams } = request.nextUrl;
  const query: ConversationListQuery = {
    status: searchParams.get('status') as ConversationListQuery['status'] || undefined,
    channel: searchParams.get('channel') as ConversationListQuery['channel'] || undefined,
    assigned_agent_id: searchParams.get('assigned_agent_id') || undefined,
    priority: searchParams.get('priority') as ConversationListQuery['priority'] || undefined,
    search: searchParams.get('search') || undefined,
    sort_by: searchParams.get('sort_by') as ConversationListQuery['sort_by'] || undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
    page_size: searchParams.get('page_size') ? Number(searchParams.get('page_size')) : undefined,
  };

  const result = await listConversations(userResult.data.org_id, query);
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
    const { contact, channel, proxy_address } = body;

    if (!contact || !channel) {
      return NextResponse.json(
        toApiResponse(failure('VALIDATION_ERROR', 'Contact and channel are required')),
        { status: 400 }
      );
    }

    const result = await getOrCreateConversation(userResult.data.org_id, contact, channel, proxy_address);
    if (!result.success) {
      return NextResponse.json(toApiResponse(result), { status: mapErrorToHttpStatus(result.error.code) });
    }

    return NextResponse.json(toApiResponse(result), { status: 201 });
  } catch {
    return NextResponse.json(
      toApiResponse(failure('INTERNAL_ERROR', 'Failed to create conversation')),
      { status: 500 }
    );
  }
}
