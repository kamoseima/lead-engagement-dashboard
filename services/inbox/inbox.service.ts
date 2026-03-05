/**
 * Inbox Service
 *
 * Wraps platform API calls for conversation operations.
 * All conversation data lives in the platform — this is a thin proxy layer.
 */

import { platformApi } from '@/lib/platform-api';
import { createAdminClient } from '@/lib/supabase/admin';
import { type StepResult, failure, success } from '@/lib/shared/result';
import type {
  Conversation,
  ConversationListResponse,
  ConversationListQuery,
  TimelineResponse,
  ConversationNote,
  CannedResponse,
  CreateCannedResponseInput,
  ConversationStatus,
  ConversationPriority,
} from '@/types/inbox';

function orgPath(orgId: string): string {
  return `/api/v1/orgs/${orgId}`;
}

function safeDecodeBody(body: string | null | undefined): string | null {
  if (!body) return null;
  if (!body.includes('%') && !body.includes('+')) return body;
  try {
    return decodeURIComponent(body.replace(/\+/g, ' '));
  } catch {
    return body;
  }
}

async function resolveConversationSid(
  orgId: string,
  conversationId: string
): Promise<string | null> {
  if (/^(CH|IS)/.test(conversationId)) return conversationId;

  const admin = createAdminClient();
  const { data } = await admin
    .from('contact_twilio_conversations')
    .select('twilio_conversation_sid')
    .eq('organization_id', orgId)
    .eq('id', conversationId)
    .maybeSingle();

  return (data?.twilio_conversation_sid as string | undefined) ?? null;
}

async function getTimelineFromSupabaseFallback(
  orgId: string,
  conversationId: string,
  limit = 30,
  pageToken?: string
): Promise<StepResult<TimelineResponse>> {
  const sid = await resolveConversationSid(orgId, conversationId);
  if (!sid) {
    return failure('PROVIDER_ERROR', 'Could not resolve conversation SID for fallback timeline');
  }

  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const offset = pageToken?.startsWith('db:')
    ? Math.max(parseInt(pageToken.slice(3), 10) || 0, 0)
    : 0;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('communication_messages')
    .select('id, twilio_message_sid, channel, status, subject, body_preview, request_payload, created_at')
    .eq('organization_id', orgId)
    .eq('twilio_conversation_sid', sid)
    .in('status', ['delivered', 'sent', 'queued'])
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (error) {
    return failure('PROVIDER_ERROR', `Fallback timeline query failed: ${error.message}`);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    twilio_message_sid: string | null;
    channel: string | null;
    status: string | null;
    subject: string | null;
    body_preview: string | null;
    request_payload: Record<string, unknown> | null;
    created_at: string | null;
  }>;

  const dbMessages = rows
    .map((row) => {
      const payload = row.request_payload ?? {};
      const direction = payload.direction as string | undefined;
      const from = payload.from as string | undefined;
      const sender = payload.sender as string | undefined;
      const author = direction === 'inbound' ? (from ?? 'contact') : (sender ?? 'agent');

      return {
        id: row.id,
        twilio_conversation_sid: sid,
        twilio_message_sid: row.twilio_message_sid,
        channel: row.channel,
        status: row.status,
        subject: row.subject,
        body_preview: safeDecodeBody(row.body_preview),
        author,
        index: null,
        date_created: row.created_at,
        created_at: row.created_at,
      };
    });

  // Some agent-authored conversation messages may exist only in Twilio conversation
  // event logs when timeline endpoint fails upstream. Merge outbound event rows.
  const eventWindow = Math.max(200, safeLimit * 5 + offset);
  const { data: eventRows } = await admin
    .from('twilio_conversation_events')
    .select('id, payload, created_at')
    .eq('organization_id', orgId)
    .eq('twilio_conversation_sid', sid)
    .eq('event_type', 'onMessageAdded')
    .order('created_at', { ascending: false })
    .limit(eventWindow);

  const outboundEventMessages = (eventRows ?? [])
    .map((row) => {
      const payload = (row.payload ?? {}) as Record<string, unknown>;
      const direction = (payload.Direction as string | undefined)?.toLowerCase();
      const author = (payload.Author as string | undefined) ?? null;
      const isInboundByDirection = direction === 'inbound';
      const isInboundByAuthor = !!author && (author.startsWith('+') || author.startsWith('whatsapp:'));
      if (isInboundByDirection || isInboundByAuthor) return null;

      const bodyRaw = (payload.Body as string | undefined) ?? null;
      const body = safeDecodeBody(bodyRaw);
      if (!body?.trim()) return null;

      const messageSid = (payload.MessageSid as string | undefined) ?? null;
      const indexRaw = payload.Index as string | number | undefined;
      const index = typeof indexRaw === 'number'
        ? indexRaw
        : typeof indexRaw === 'string' && indexRaw.trim() !== ''
          ? Number(indexRaw)
          : null;
      const dateCreated = (payload.DateCreated as string | undefined) ?? row.created_at ?? null;

      return {
        id: messageSid || `evt-${row.id}`,
        twilio_conversation_sid: sid,
        twilio_message_sid: messageSid,
        channel: 'whatsapp' as const,
        status: 'sent',
        subject: null,
        body_preview: body,
        author,
        index: Number.isFinite(index) ? (index as number) : null,
        date_created: dateCreated,
        created_at: dateCreated,
      };
    })
    .filter(Boolean) as TimelineResponse['messages'];

  const seenKeys = new Set<string>();
  const allMerged = [...dbMessages, ...outboundEventMessages].filter((m) => {
    const k = m.twilio_message_sid || `${m.author || ''}|${m.created_at || ''}|${m.body_preview || ''}`;
    if (seenKeys.has(k)) return false;
    seenKeys.add(k);
    return true;
  });

  const messages = allMerged.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return ta - tb;
    });

  const nextPageToken = rows.length === safeLimit ? `db:${offset + safeLimit}` : null;

  return success({
    messages,
    limit: safeLimit,
    nextPageToken,
  });
}

// --- Conversations ---

export async function listConversations(
  orgId: string,
  query: ConversationListQuery = {}
): Promise<StepResult<ConversationListResponse>> {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.channel) params.set('channel', query.channel);
  if (query.assigned_agent_id) params.set('assigned_agent_id', query.assigned_agent_id);
  if (query.priority) params.set('priority', query.priority);
  if (query.search) params.set('search', query.search);
  if (query.sort_by) params.set('sort_by', query.sort_by);
  if (query.page) params.set('page', String(query.page));
  if (query.page_size) params.set('page_size', String(query.page_size));

  const qs = params.toString();
  const path = `${orgPath(orgId)}/conversations${qs ? `?${qs}` : ''}`;
  const result = await platformApi<ConversationListResponse>(path);
  if (!result.success) return result;

  const conversations = [...(result.data.conversations ?? [])];
  const missingPreviewSids = conversations
    .filter(c => !c.last_message_preview && c.last_message_at)
    .map(c => c.twilio_conversation_sid);

  if (missingPreviewSids.length > 0) {
    const admin = createAdminClient();
    const { data: rows } = await admin
      .from('communication_messages')
      .select('twilio_conversation_sid, body_preview, created_at')
      .eq('organization_id', orgId)
      .in('twilio_conversation_sid', missingPreviewSids)
      .in('status', ['delivered', 'sent', 'queued'])
      .order('created_at', { ascending: false })
      .limit(500);

    const latestBySid = new Map<string, string>();
    for (const row of rows ?? []) {
      const sid = row.twilio_conversation_sid as string;
      if (latestBySid.has(sid)) continue;
      const body = safeDecodeBody(row.body_preview as string | null);
      if (body) latestBySid.set(sid, body.slice(0, 200));
    }

    for (const convo of conversations) {
      if (!convo.last_message_preview) {
        convo.last_message_preview = latestBySid.get(convo.twilio_conversation_sid) ?? null;
      }
    }
  }

  return success({
    ...result.data,
    conversations,
  });
}

export async function getConversation(
  orgId: string,
  conversationId: string
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(`${orgPath(orgId)}/conversations/${conversationId}`);
}

export async function getOrCreateConversation(
  orgId: string,
  contact: string,
  channel: string,
  proxyAddress?: string
): Promise<StepResult<{ conversation: Conversation; created: boolean }>> {
  return platformApi<{ conversation: Conversation; created: boolean }>(
    `${orgPath(orgId)}/conversations`,
    {
      method: 'POST',
      body: { contact, channel, ...(proxyAddress ? { proxy_address: proxyAddress } : {}) },
    }
  );
}

// --- Timeline / Messages ---

export async function getTimeline(
  orgId: string,
  conversationId: string,
  limit?: number,
  pageToken?: string
): Promise<StepResult<TimelineResponse>> {
  const params = new URLSearchParams();
  if (limit) params.set('limit', String(limit));
  if (pageToken) params.set('pageToken', pageToken);

  const qs = params.toString();
  const result = await platformApi<TimelineResponse>(
    `${orgPath(orgId)}/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`
  );
  if (result.success) return result;

  // Fallback path when platform timeline endpoint fails (e.g. malformed body decode upstream).
  return getTimelineFromSupabaseFallback(orgId, conversationId, limit, pageToken);
}

export async function sendMessage(
  orgId: string,
  conversationId: string,
  body: string,
  authorId: string,
  attributes?: Record<string, unknown>
): Promise<StepResult<unknown>> {
  if (!body.trim()) {
    return failure('VALIDATION_ERROR', 'Message body cannot be empty');
  }

  return platformApi<unknown>(
    `${orgPath(orgId)}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      body: { body, author_id: authorId, ...(attributes ? { attributes } : {}) },
    }
  );
}

// --- Status / Assignment ---

export async function updateConversationStatus(
  orgId: string,
  conversationId: string,
  status: ConversationStatus
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(
    `${orgPath(orgId)}/conversations/${conversationId}`,
    { method: 'PATCH', body: { status } }
  );
}

export async function updateConversationPriority(
  orgId: string,
  conversationId: string,
  priority: ConversationPriority
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(
    `${orgPath(orgId)}/conversations/${conversationId}`,
    { method: 'PATCH', body: { priority } }
  );
}

export async function assignConversation(
  orgId: string,
  conversationId: string,
  agentId: string | null
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(
    `${orgPath(orgId)}/conversations/${conversationId}/assign`,
    { method: 'POST', body: { agent_id: agentId } }
  );
}

export async function escalateConversation(
  orgId: string,
  conversationId: string,
  agentId: string,
  reason?: string
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(
    `${orgPath(orgId)}/conversations/${conversationId}/escalate`,
    { method: 'POST', body: { agent_id: agentId, ...(reason ? { reason } : {}) } }
  );
}

export async function snoozeConversation(
  orgId: string,
  conversationId: string,
  snoozeUntil: string
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(
    `${orgPath(orgId)}/conversations/${conversationId}/snooze`,
    { method: 'POST', body: { snooze_until: snoozeUntil } }
  );
}

// --- Notes ---

export async function listNotes(
  orgId: string,
  conversationId: string
): Promise<StepResult<{ notes: ConversationNote[] }>> {
  return platformApi<{ notes: ConversationNote[] }>(
    `${orgPath(orgId)}/conversations/${conversationId}/notes`
  );
}

export async function createNote(
  orgId: string,
  conversationId: string,
  agentId: string,
  content: string
): Promise<StepResult<ConversationNote>> {
  if (!content.trim()) {
    return failure('VALIDATION_ERROR', 'Note content cannot be empty');
  }

  return platformApi<ConversationNote>(
    `${orgPath(orgId)}/conversations/${conversationId}/notes`,
    { method: 'POST', body: { agent_id: agentId, content } }
  );
}

// --- Canned Responses ---

export async function listCannedResponses(
  orgId: string,
  params?: { search?: string; category?: string }
): Promise<StepResult<{ canned_responses: CannedResponse[] }>> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.category) qs.set('category', params.category);

  const qsStr = qs.toString();
  return platformApi<{ canned_responses: CannedResponse[] }>(
    `${orgPath(orgId)}/canned-responses${qsStr ? `?${qsStr}` : ''}`
  );
}

export async function createCannedResponse(
  orgId: string,
  input: CreateCannedResponseInput
): Promise<StepResult<CannedResponse>> {
  if (!input.name || !input.content) {
    return failure('VALIDATION_ERROR', 'Name and content are required');
  }

  return platformApi<CannedResponse>(
    `${orgPath(orgId)}/canned-responses`,
    { method: 'POST', body: input }
  );
}

export async function updateCannedResponse(
  orgId: string,
  id: string,
  input: Partial<CreateCannedResponseInput>
): Promise<StepResult<CannedResponse>> {
  return platformApi<CannedResponse>(
    `${orgPath(orgId)}/canned-responses/${id}`,
    { method: 'PATCH', body: input }
  );
}

export async function deleteCannedResponse(
  orgId: string,
  id: string
): Promise<StepResult<void>> {
  return platformApi<void>(
    `${orgPath(orgId)}/canned-responses/${id}`,
    { method: 'DELETE' }
  );
}
