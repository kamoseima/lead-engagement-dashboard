'use client';

import { useEffect } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';

export function useInboxKeyboard() {
  const {
    conversations,
    selectedConversationId,
    selectConversation,
    resetUnread,
    setSidebarTab,
  } = useInboxStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'j': {
          // Next conversation
          e.preventDefault();
          const idx = conversations.findIndex(c => c.twilio_conversation_sid === selectedConversationId);
          const next = conversations[idx + 1];
          if (next) {
            selectConversation(next.twilio_conversation_sid, next);
            resetUnread(next.twilio_conversation_sid);
          }
          break;
        }
        case 'k': {
          // Previous conversation
          e.preventDefault();
          const idx = conversations.findIndex(c => c.twilio_conversation_sid === selectedConversationId);
          const prev = conversations[idx - 1];
          if (prev) {
            selectConversation(prev.twilio_conversation_sid, prev);
            resetUnread(prev.twilio_conversation_sid);
          }
          break;
        }
        case 'r': {
          // Focus reply composer
          e.preventDefault();
          const textarea = document.querySelector('.thread-composer textarea') as HTMLTextAreaElement;
          textarea?.focus();
          break;
        }
        case 'n': {
          // Switch to notes tab
          e.preventDefault();
          setSidebarTab('notes');
          break;
        }
        case 'a': {
          // Switch to actions tab
          e.preventDefault();
          setSidebarTab('actions');
          break;
        }
        case 'd': {
          // Switch to details tab
          e.preventDefault();
          setSidebarTab('details');
          break;
        }
        case 'Escape': {
          // Deselect conversation
          e.preventDefault();
          selectConversation(null);
          break;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [conversations, selectedConversationId, selectConversation, resetUnread, setSidebarTab]);
}
