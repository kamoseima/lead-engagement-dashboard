'use client';

import { useEffect, useRef } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';

export function useInboxSSE() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const {
    selectedConversationId,
    addConversationToList,
    appendMessage,
    updateConversationInList,
    incrementUnread,
    setTypingIndicator,
    clearTypingIndicator,
  } = useInboxStore();

  // Store selected ID in ref for use in event handler
  const selectedIdRef = useRef(selectedConversationId);
  selectedIdRef.current = selectedConversationId;

  useEffect(() => {
    function connect() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/v1/inbox/stream');
      eventSourceRef.current = es;

      es.addEventListener('conversation.created', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.conversation) {
            addConversationToList(data.conversation);
          }
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('message.added', (e) => {
        try {
          const data = JSON.parse(e.data);
          const sid = data.conversation_sid;
          if (!sid) return;

          // Twilio webhook payloads use PascalCase keys (Body, Author, MessageSid)
          // while normalized payloads may use camelCase. Handle both.
          const p = data.payload || {};
          const msgSid = p.MessageSid || p.messageSid;
          const body = p.Body || p.body;
          const author = p.Author || p.author;
          const dateCreated = p.DateCreated || p.dateCreated;
          const channel = p.Channel || p.channel;
          const index = p.Index ?? p.index;

          // If this is the selected conversation, append the message
          if (selectedIdRef.current === sid) {
            appendMessage({
              id: msgSid || `sse-${Date.now()}`,
              twilio_conversation_sid: sid,
              twilio_message_sid: msgSid || null,
              channel: channel || null,
              status: null,
              subject: null,
              body_preview: body || null,
              author: author || null,
              index: index ?? null,
              date_created: dateCreated || new Date().toISOString(),
              created_at: new Date().toISOString(),
            });
          }

          // Update last message preview in conversation list
          updateConversationInList(sid, {
            last_message_at: new Date().toISOString(),
            last_message_preview: body || 'New message',
          });

          // Increment unread if not selected
          if (selectedIdRef.current !== sid) {
            incrementUnread(sid);
          }
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('conversation.updated', (e) => {
        try {
          const data = JSON.parse(e.data);
          const sid = data.conversation_sid;
          if (sid && data.conversation) {
            updateConversationInList(sid, data.conversation);
          }
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('typing.started', (e) => {
        try {
          const data = JSON.parse(e.data);
          const sid = data.conversation_sid;
          if (sid && data.agent_id) {
            setTypingIndicator(sid, data.agent_id, data.expires_at || '');

            // Auto-clear after TTL
            const ttl = data.expires_at
              ? Math.max(0, new Date(data.expires_at).getTime() - Date.now())
              : 5000;
            setTimeout(() => clearTypingIndicator(sid), ttl);
          }
        } catch { /* ignore parse errors */ }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [addConversationToList, appendMessage, updateConversationInList, incrementUnread, setTypingIndicator, clearTypingIndicator]);
}
