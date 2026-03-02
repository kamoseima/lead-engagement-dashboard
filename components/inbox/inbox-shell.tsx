'use client';

import { useEffect } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { ConversationListPanel } from './conversation-list/conversation-list-panel';
import { ThreadPanel } from './thread/thread-panel';
import { ContactSidebarPanel } from './contact-sidebar/contact-sidebar-panel';
import { useInboxSSE } from '@/lib/hooks/use-inbox-sse';
import { useInboxKeyboard } from '@/lib/hooks/use-inbox-keyboard';

export default function InboxShell() {
  const { selectedConversation, contactSidebarOpen, setPinnedSids } = useInboxStore();

  // Connect to SSE stream
  useInboxSSE();

  // Register keyboard shortcuts
  useInboxKeyboard();

  // Load pinned conversations on mount
  useEffect(() => {
    async function loadPins() {
      try {
        const res = await fetch('/api/v1/inbox/pins');
        const json = await res.json();
        if (json.success && json.data) {
          setPinnedSids(json.data);
        }
      } catch { /* */ }
    }
    loadPins();
  }, [setPinnedSids]);

  return (
    <div className="flex h-full">
      {/* Left: Conversation list — fixed 320px */}
      <div className="w-80 shrink-0">
        <ConversationListPanel />
      </div>

      {/* Center: Thread view — fills remaining space */}
      <div className="flex-1 min-w-0">
        <ThreadPanel />
      </div>

      {/* Right: Contact sidebar — fixed 300px, shown when conversation selected and sidebar open */}
      {selectedConversation && contactSidebarOpen && (
        <div className="w-[300px] shrink-0">
          <ContactSidebarPanel />
        </div>
      )}
    </div>
  );
}
