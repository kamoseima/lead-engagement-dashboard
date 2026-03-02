'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { ThreadHeader } from './thread-header';
import { MessageBubble } from './message-bubble';
import { ThreadComposer } from './thread-composer';
import { TypingIndicator } from './typing-indicator';
import { Inbox } from 'lucide-react';
import type { TimelineMessage } from '@/types/inbox';

function formatDaySeparator(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  // Reset to midnight for comparison
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffMs = today.getTime() - target.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDateKey(msg: TimelineMessage): string {
  const raw = msg.date_created || msg.created_at;
  if (!raw) return '';
  const d = new Date(raw);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ThreadPanel() {
  const {
    selectedConversationId,
    selectedConversation,
    messages,
    messagesLoading,
    nextPageToken,
    typingIndicators,
    setMessages,
    prependMessages,
    setMessagesLoading,
  } = useInboxStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const fetchMessages = useCallback(async (conversationId: string, pageToken?: string) => {
    if (!pageToken) setMessagesLoading(true);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (pageToken) params.set('pageToken', pageToken);

      const res = await fetch(`/api/v1/inbox/conversations/${conversationId}/messages?${params}`);
      const json = await res.json();

      if (json.success && json.data) {
        if (pageToken) {
          prependMessages(json.data.messages || [], json.data.nextPageToken || null);
        } else {
          setMessages(json.data.messages || [], json.data.nextPageToken || null);
          isInitialLoad.current = true;
        }
      } else {
        // API returned an error — clear loading state
        if (!pageToken) setMessages([], null);
      }
    } catch {
      if (!pageToken) setMessages([], null);
    }
  }, [setMessages, prependMessages, setMessagesLoading]);

  useEffect(() => {
    if (selectedConversationId) {
      fetchMessages(selectedConversationId);
    }
  }, [selectedConversationId, fetchMessages]);

  const prevMessageCountRef = useRef(0);

  // Auto-scroll on initial load and when new messages arrive (if near bottom)
  useEffect(() => {
    if (messages.length === 0) {
      prevMessageCountRef.current = 0;
      return;
    }

    if (isInitialLoad.current) {
      messagesEndRef.current?.scrollIntoView();
      isInitialLoad.current = false;
    } else if (messages.length > prevMessageCountRef.current) {
      // New message appended — scroll if user is near the bottom
      const container = containerRef.current;
      if (container) {
        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        if (distanceFromBottom < 150) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }

    prevMessageCountRef.current = messages.length;
  }, [messages]);

  const handleLoadMore = () => {
    if (selectedConversationId && nextPageToken) {
      fetchMessages(selectedConversationId, nextPageToken);
    }
  };

  const typingForConvo = selectedConversationId ? typingIndicators[selectedConversationId] : null;

  // Empty state
  if (!selectedConversationId || !selectedConversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="rounded-2xl bg-muted p-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-foreground">Select a conversation</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Choose a conversation from the list to start messaging
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <ThreadHeader conversation={selectedConversation} />

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-3">
        {/* Load more button */}
        {nextPageToken && (
          <div className="mb-3 text-center">
            <button
              onClick={handleLoadMore}
              className="rounded-md bg-muted px-3 py-1 text-xs text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
            >
              Load earlier messages
            </button>
          </div>
        )}

        {messagesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className="animate-pulse rounded-2xl bg-muted p-4" style={{ width: `${40 + Math.random() * 40}%` }}>
                  <div className="h-3 w-full rounded bg-muted-foreground/20" />
                  <div className="mt-1.5 h-3 w-2/3 rounded bg-muted-foreground/20" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((msg, idx) => {
              const currentKey = getDateKey(msg);
              const prevKey = idx > 0 ? getDateKey(messages[idx - 1]) : '';
              const showSeparator = currentKey && currentKey !== prevKey;

              return (
                <div key={msg.id || msg.twilio_message_sid || msg.index}>
                  {showSeparator && (
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 border-t border-border" />
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {formatDaySeparator(msg.date_created || msg.created_at || '')}
                      </span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                  )}
                  <MessageBubble message={msg} />
                </div>
              );
            })}
          </div>
        )}

        {/* Typing indicator */}
        {typingForConvo && <TypingIndicator agentId={typingForConvo.agent_id} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <ThreadComposer conversationId={selectedConversationId} />
    </div>
  );
}
