'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import type { TimelineMessage } from '@/types/inbox';

const MESSAGE_POLL_MS = 5_000;
const CONVERSATION_POLL_MS = 15_000;

/**
 * Polls for new messages in the selected conversation and refreshes the
 * conversation list periodically. Replaces the SSE proxy approach which
 * breaks on Vercel due to serverless function timeouts.
 */
export function useInboxSSE() {
  const {
    selectedConversationId,
    messages,
    conversations,
    statusFilter,
    channelFilter,
    priorityFilter,
    searchQuery,
    sortBy,
    appendMessage,
    setConversations,
    updateConversationInList,
    incrementUnread,
  } = useInboxStore();

  const selectedIdRef = useRef(selectedConversationId);
  selectedIdRef.current = selectedConversationId;

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  // ---------------------------------------------------------------
  // Poll messages for the currently selected conversation
  // ---------------------------------------------------------------
  const pollMessages = useCallback(async () => {
    const convoId = selectedIdRef.current;
    if (!convoId) return;

    try {
      const res = await fetch(
        `/api/v1/inbox/conversations/${convoId}/messages?limit=10`
      );
      const json = await res.json();
      if (!json.success || !json.data?.messages) return;

      const incoming: TimelineMessage[] = json.data.messages;
      const known = messagesRef.current;

      // Build a set of known message IDs for fast dedup
      const knownIds = new Set(
        known.map((m) => m.id || m.twilio_message_sid || '')
      );

      const fresh = incoming.filter((m) => {
        const id = m.id || m.twilio_message_sid || '';
        return id && !knownIds.has(id);
      });

      // Only append messages that are actually newer than what we have
      if (fresh.length > 0 && known.length > 0) {
        const latestKnownTs = Math.max(
          ...known.map((m) =>
            new Date(m.date_created || m.created_at || 0).getTime()
          )
        );

        const newMsgs = fresh.filter((m) => {
          const ts = new Date(m.date_created || m.created_at || 0).getTime();
          return ts >= latestKnownTs;
        });

        for (const msg of newMsgs) {
          appendMessage(msg);
        }
      } else if (fresh.length > 0 && known.length === 0) {
        // Thread was empty, now has messages — just append all
        for (const msg of fresh) {
          appendMessage(msg);
        }
      }
    } catch {
      /* network error — retry next cycle */
    }
  }, [appendMessage]);

  // ---------------------------------------------------------------
  // Poll conversation list for sidebar updates
  // ---------------------------------------------------------------
  const pollConversations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (channelFilter !== 'all') params.set('channel', channelFilter);
      if (priorityFilter !== 'all') params.set('priority', priorityFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('sort_by', sortBy);
      params.set('page_size', '50');

      const qs = params.toString();
      const res = await fetch(`/api/v1/inbox/conversations${qs ? `?${qs}` : ''}`);
      const json = await res.json();
      if (!json.success || !json.data) return;

      const incoming = json.data.conversations || [];
      const prev = conversationsRef.current;

      // Detect unread bumps: conversations whose last_message_at changed
      // and are not the currently selected one
      const prevMap = new Map(
        prev.map((c) => [c.twilio_conversation_sid, c.last_message_at])
      );

      for (const c of incoming) {
        const prevTs = prevMap.get(c.twilio_conversation_sid);
        if (
          prevTs &&
          c.last_message_at !== prevTs &&
          selectedIdRef.current !== c.twilio_conversation_sid
        ) {
          incrementUnread(c.twilio_conversation_sid);
        }
      }

      setConversations(incoming, json.data.total || 0);
    } catch {
      /* retry next cycle */
    }
  }, [
    statusFilter,
    channelFilter,
    priorityFilter,
    searchQuery,
    sortBy,
    setConversations,
    incrementUnread,
  ]);

  // ---------------------------------------------------------------
  // Set up polling intervals
  // ---------------------------------------------------------------
  useEffect(() => {
    const msgInterval = setInterval(pollMessages, MESSAGE_POLL_MS);
    const convoInterval = setInterval(pollConversations, CONVERSATION_POLL_MS);

    return () => {
      clearInterval(msgInterval);
      clearInterval(convoInterval);
    };
  }, [pollMessages, pollConversations]);
}
