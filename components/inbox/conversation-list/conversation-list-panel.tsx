'use client';

import { useEffect, useCallback } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { ConversationListItem } from './conversation-list-item';
import { ConversationFilters } from './conversation-filters';
import { Search } from 'lucide-react';

export function ConversationListPanel() {
  const {
    conversations,
    isLoading,
    statusFilter,
    channelFilter,
    priorityFilter,
    searchQuery,
    sortBy,
    selectedConversationId,
    pinnedSids,
    setConversations,
    setLoading,
    selectConversation,
    setSearchQuery,
    resetUnread,
  } = useInboxStore();

  const fetchConversations = useCallback(async () => {
    setLoading(true);
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

      if (json.success && json.data) {
        setConversations(json.data.conversations || [], json.data.total || 0);
      } else {
        setConversations([], 0);
      }
    } catch {
      setConversations([], 0);
    }
  }, [statusFilter, channelFilter, priorityFilter, searchQuery, sortBy, setConversations, setLoading]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelect = (conv: typeof conversations[0]) => {
    selectConversation(conv.twilio_conversation_sid, conv);
    resetUnread(conv.twilio_conversation_sid);
  };

  // Separate pinned and unpinned
  const pinnedConversations = conversations.filter(c => pinnedSids.includes(c.twilio_conversation_sid));
  const unpinnedConversations = conversations.filter(c => !pinnedSids.includes(c.twilio_conversation_sid));

  return (
    <div className="flex h-full flex-col border-r border-border">
      {/* Search */}
      <div className="border-b border-border p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Filters */}
      <ConversationFilters />

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-muted/50 p-3">
                <div className="mb-2 h-3 w-3/4 rounded bg-muted" />
                <div className="h-2 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-sm text-muted-foreground">No conversations found</p>
            <p className="mt-1 text-xs text-muted-foreground/60">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="space-y-0.5 p-1">
            {/* Pinned section */}
            {pinnedConversations.length > 0 && (
              <>
                <div className="px-3 py-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Pinned
                  </span>
                </div>
                {pinnedConversations.map(conv => (
                  <ConversationListItem
                    key={conv.id}
                    conversation={conv}
                    isSelected={selectedConversationId === conv.twilio_conversation_sid}
                    isPinned
                    onClick={() => handleSelect(conv)}
                  />
                ))}
                <div className="my-1 border-b border-border" />
              </>
            )}

            {/* Regular conversations */}
            {unpinnedConversations.map(conv => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isSelected={selectedConversationId === conv.twilio_conversation_sid}
                isPinned={false}
                onClick={() => handleSelect(conv)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
