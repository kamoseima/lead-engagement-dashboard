/**
 * Inbox Service
 *
 * Wraps platform API calls for conversation operations.
 * All conversation data lives in the platform — this is a thin proxy layer.
 */

import { platformApi } from '@/lib/platform-api';
import { type StepResult, failure } from '@/lib/shared/result';
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
  return platformApi<ConversationListResponse>(path);
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
  return platformApi<TimelineResponse>(
    `${orgPath(orgId)}/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`
  );
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
    `${orgPath(orgId)}/conversations/${conversationId}/status`,
    { method: 'PATCH', body: { status } }
  );
}

export async function updateConversationPriority(
  orgId: string,
  conversationId: string,
  priority: ConversationPriority
): Promise<StepResult<Conversation>> {
  return platformApi<Conversation>(
    `${orgPath(orgId)}/conversations/${conversationId}/priority`,
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
