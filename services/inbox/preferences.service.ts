/**
 * Inbox Preferences Service
 *
 * Manages dashboard-local inbox state: agent preferences, pinned conversations, drafts.
 * Data stored in local Supabase tables (not the platform).
 */

import { createClient } from '@/lib/supabase/server';
import { type StepResult, success, failure } from '@/lib/shared/result';
import type { InboxAgentPreferences } from '@/types/inbox';

// --- Agent Preferences ---

export async function getPreferences(userId: string): Promise<StepResult<InboxAgentPreferences | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inbox_agent_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return failure('INTERNAL_ERROR', 'Failed to fetch preferences');
  }

  return success(data as InboxAgentPreferences | null);
}

export async function upsertPreferences(
  userId: string,
  orgId: string,
  prefs: Partial<InboxAgentPreferences>
): Promise<StepResult<InboxAgentPreferences>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inbox_agent_preferences')
    .upsert(
      { user_id: userId, org_id: orgId, ...prefs, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) {
    return failure('INTERNAL_ERROR', `Failed to save preferences: ${error.message}`);
  }

  return success(data as InboxAgentPreferences);
}

// --- Pinned Conversations ---

export async function getPinnedConversations(userId: string): Promise<StepResult<string[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inbox_pinned_conversations')
    .select('conversation_sid')
    .eq('user_id', userId)
    .order('pinned_at', { ascending: false });

  if (error) {
    return failure('INTERNAL_ERROR', 'Failed to fetch pinned conversations');
  }

  return success((data || []).map(row => row.conversation_sid));
}

export async function pinConversation(
  userId: string,
  orgId: string,
  conversationSid: string
): Promise<StepResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('inbox_pinned_conversations')
    .upsert(
      { user_id: userId, org_id: orgId, conversation_sid: conversationSid },
      { onConflict: 'user_id,conversation_sid' }
    );

  if (error) {
    return failure('INTERNAL_ERROR', `Failed to pin conversation: ${error.message}`);
  }

  return success(undefined);
}

export async function unpinConversation(
  userId: string,
  conversationSid: string
): Promise<StepResult<void>> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('inbox_pinned_conversations')
    .delete()
    .eq('user_id', userId)
    .eq('conversation_sid', conversationSid);

  if (error) {
    return failure('INTERNAL_ERROR', `Failed to unpin conversation: ${error.message}`);
  }

  return success(undefined);
}

// --- Draft Messages ---

export async function getDraft(
  userId: string,
  conversationSid: string,
  isNote: boolean = false
): Promise<StepResult<string | null>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('inbox_draft_messages')
    .select('content')
    .eq('user_id', userId)
    .eq('conversation_sid', conversationSid)
    .eq('is_note', isNote)
    .single();

  if (error && error.code !== 'PGRST116') {
    return failure('INTERNAL_ERROR', 'Failed to fetch draft');
  }

  return success(data?.content || null);
}

export async function saveDraft(
  userId: string,
  orgId: string,
  conversationSid: string,
  content: string,
  channel: string | null,
  isNote: boolean = false
): Promise<StepResult<void>> {
  const supabase = await createClient();

  if (!content.trim()) {
    // Delete draft if empty
    await supabase
      .from('inbox_draft_messages')
      .delete()
      .eq('user_id', userId)
      .eq('conversation_sid', conversationSid)
      .eq('is_note', isNote);
    return success(undefined);
  }

  const { error } = await supabase
    .from('inbox_draft_messages')
    .upsert(
      {
        user_id: userId,
        org_id: orgId,
        conversation_sid: conversationSid,
        content,
        channel,
        is_note: isNote,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,conversation_sid,is_note' }
    );

  if (error) {
    return failure('INTERNAL_ERROR', `Failed to save draft: ${error.message}`);
  }

  return success(undefined);
}
