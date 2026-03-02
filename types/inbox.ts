/**
 * Inbox Types
 *
 * Types for the unified omnichannel inbox.
 * Mirrors the platform's conversation.types.ts adapted for dashboard use.
 */

// Enums matching platform

export type ConversationStatus =
  | 'open'
  | 'waiting_on_customer'
  | 'waiting_on_agent'
  | 'resolved'
  | 'snoozed'
  | 'archived'
  | 'escalated';

export type ConversationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type ChannelType = 'whatsapp' | 'sms' | 'email' | 'voice';

// Conversation

export interface Conversation {
  id: string;
  organization_id: string;
  contact_identifier: string;
  twilio_conversation_sid: string;
  channel: ChannelType | null;
  status: ConversationStatus;
  priority: ConversationPriority;
  assigned_agent_id: string | null;
  assigned_agent_name?: string | null;
  snoozed_until: string | null;
  last_message_at: string | null;
  last_message_preview?: string | null;
  unread_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  page_size: number;
}

export interface ConversationListQuery {
  status?: ConversationStatus;
  channel?: ChannelType;
  assigned_agent_id?: string;
  priority?: ConversationPriority;
  search?: string;
  sort_by?: 'last_message_at' | 'priority';
  page?: number;
  page_size?: number;
}

// Timeline / Messages

export interface MessageMedia {
  sid: string;
  contentType: string;
  filename: string;
  size: number;
  url?: string;
}

export interface TimelineMessage {
  id: string;
  twilio_conversation_sid: string;
  twilio_message_sid: string | null;
  channel: string | null;
  status: string | null;
  subject: string | null;
  body_preview: string | null;
  author: string | null;
  index: number | null;
  date_created: string | null;
  created_at: string | null;
  media?: MessageMedia[];
  attributes?: Record<string, unknown>;
}

export interface TimelineResponse {
  messages: TimelineMessage[];
  limit: number;
  nextPageToken: string | null;
}

// Notes

export interface ConversationNote {
  id: string;
  twilio_conversation_sid: string;
  agent_id: string;
  agent_name?: string;
  content: string;
  created_at: string;
  updated_at: string;
}

// Canned Responses

export interface CannedResponse {
  id: string;
  organization_id: string;
  name: string;
  shortcut: string | null;
  content: string;
  category: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCannedResponseInput {
  name: string;
  content: string;
  shortcut?: string;
  category?: string;
}

// SSE Events

export type InboxSSEEventType =
  | 'conversation.created'
  | 'message.added'
  | 'conversation.updated'
  | 'typing.started';

export interface InboxSSEEvent {
  type: InboxSSEEventType;
  data: {
    conversation_sid: string;
    event_type?: string;
    payload?: unknown;
    conversation?: Partial<Conversation>;
    agent_id?: string;
    expires_at?: string;
  };
}

// Agent Preferences (local DB)

export interface InboxAgentPreferences {
  id: string;
  user_id: string;
  org_id: string;
  default_status_filter: string;
  default_sort: string;
  notification_sound: boolean;
  desktop_notifications: boolean;
  auto_assign_on_reply: boolean;
  signature: string | null;
  default_channel: string;
  send_on_enter: boolean;
  sidebar_collapsed: boolean;
  compact_view: boolean;
  created_at: string;
  updated_at: string;
}

// Action Inputs

export interface SendMessageInput {
  body: string;
  channel?: ChannelType;
  media_url?: string;
}

export interface AssignInput {
  agent_id: string | null;
}

export interface SnoozeInput {
  snooze_until: string;
}

export interface EscalateInput {
  agent_id: string;
  reason?: string;
}

export interface CreateConversationInput {
  contact: string;
  channel: ChannelType;
  proxy_address?: string;
}
