'use client';

import { create } from 'zustand';
import type {
  Conversation,
  ConversationStatus,
  ConversationPriority,
  ChannelType,
  TimelineMessage,
  ConversationNote,
} from '@/types/inbox';

interface InboxState {
  // Conversation list
  conversations: Conversation[];
  total: number;
  isLoading: boolean;

  // Filters
  statusFilter: ConversationStatus | 'all';
  channelFilter: ChannelType | 'all';
  priorityFilter: ConversationPriority | 'all';
  assignedFilter: string;
  searchQuery: string;
  sortBy: 'last_message_at' | 'priority';

  // Selected conversation
  selectedConversationId: string | null;
  selectedConversation: Conversation | null;

  // Messages for selected conversation
  messages: TimelineMessage[];
  messagesLoading: boolean;
  nextPageToken: string | null;

  // Notes for selected conversation
  notes: ConversationNote[];

  // Unread counts
  unreadCounts: Record<string, number>;
  globalUnreadCount: number;

  // Typing indicators
  typingIndicators: Record<string, { agent_id: string; expires_at: string }>;

  // Pinned conversations
  pinnedSids: string[];

  // Contact sidebar
  contactSidebarOpen: boolean;
  sidebarTab: 'details' | 'notes' | 'actions';

  // Actions
  setConversations: (convos: Conversation[], total: number) => void;
  setLoading: (loading: boolean) => void;
  selectConversation: (id: string | null, conversation?: Conversation) => void;
  setMessages: (msgs: TimelineMessage[], nextToken: string | null) => void;
  prependMessages: (msgs: TimelineMessage[], nextToken: string | null) => void;
  appendMessage: (msg: TimelineMessage) => void;
  setMessagesLoading: (loading: boolean) => void;
  setNotes: (notes: ConversationNote[]) => void;
  addNote: (note: ConversationNote) => void;
  updateConversationInList: (sid: string, updates: Partial<Conversation>) => void;
  addConversationToList: (conv: Conversation) => void;
  setFilter: (key: string, value: string) => void;
  setSearchQuery: (query: string) => void;
  setTypingIndicator: (sid: string, agentId: string, expiresAt: string) => void;
  clearTypingIndicator: (sid: string) => void;
  incrementUnread: (sid: string) => void;
  resetUnread: (sid: string) => void;
  setPinnedSids: (sids: string[]) => void;
  togglePin: (sid: string) => void;
  setContactSidebarOpen: (open: boolean) => void;
  toggleContactSidebar: () => void;
  setSidebarTab: (tab: 'details' | 'notes' | 'actions') => void;
}

export const useInboxStore = create<InboxState>((set, get) => ({
  // Initial state
  conversations: [],
  total: 0,
  isLoading: false,

  statusFilter: 'open',
  channelFilter: 'all',
  priorityFilter: 'all',
  assignedFilter: 'all',
  searchQuery: '',
  sortBy: 'last_message_at',

  selectedConversationId: null,
  selectedConversation: null,

  messages: [],
  messagesLoading: false,
  nextPageToken: null,

  notes: [],

  unreadCounts: {},
  globalUnreadCount: 0,

  typingIndicators: {},

  pinnedSids: [],

  contactSidebarOpen: true,
  sidebarTab: 'details',

  // Actions
  setConversations: (convos, total) => set({ conversations: convos, total, isLoading: false }),

  setLoading: (loading) => set({ isLoading: loading }),

  selectConversation: (id, conversation) => set({
    selectedConversationId: id,
    selectedConversation: conversation || null,
    messages: [],
    messagesLoading: id !== null,
    nextPageToken: null,
    notes: [],
    sidebarTab: 'details',
  }),

  setMessages: (msgs, nextToken) => set({
    messages: msgs,
    messagesLoading: false,
    nextPageToken: nextToken,
  }),

  prependMessages: (msgs, nextToken) => set((state) => ({
    messages: [...msgs, ...state.messages],
    nextPageToken: nextToken,
  })),

  appendMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg],
  })),

  setMessagesLoading: (loading) => set({ messagesLoading: loading }),

  setNotes: (notes) => set({ notes }),

  addNote: (note) => set((state) => ({
    notes: [...state.notes, note],
  })),

  updateConversationInList: (sid, updates) => set((state) => {
    const conversations = state.conversations.map((c) =>
      c.twilio_conversation_sid === sid ? { ...c, ...updates } : c
    );
    const selectedConversation =
      state.selectedConversation?.twilio_conversation_sid === sid
        ? { ...state.selectedConversation, ...updates }
        : state.selectedConversation;
    return { conversations, selectedConversation };
  }),

  addConversationToList: (conv) => set((state) => ({
    conversations: [conv, ...state.conversations],
    total: state.total + 1,
  })),

  setFilter: (key, value) => {
    const update: Record<string, unknown> = {};
    switch (key) {
      case 'status': update.statusFilter = value; break;
      case 'channel': update.channelFilter = value; break;
      case 'priority': update.priorityFilter = value; break;
      case 'assigned': update.assignedFilter = value; break;
      case 'sort_by': update.sortBy = value; break;
    }
    set(update as Partial<InboxState>);
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setTypingIndicator: (sid, agentId, expiresAt) => set((state) => ({
    typingIndicators: { ...state.typingIndicators, [sid]: { agent_id: agentId, expires_at: expiresAt } },
  })),

  clearTypingIndicator: (sid) => set((state) => {
    const { [sid]: _, ...rest } = state.typingIndicators;
    return { typingIndicators: rest };
  }),

  incrementUnread: (sid) => set((state) => {
    if (state.selectedConversation?.twilio_conversation_sid === sid) return state;
    const current = state.unreadCounts[sid] || 0;
    return {
      unreadCounts: { ...state.unreadCounts, [sid]: current + 1 },
      globalUnreadCount: state.globalUnreadCount + 1,
    };
  }),

  resetUnread: (sid) => set((state) => {
    const count = state.unreadCounts[sid] || 0;
    const { [sid]: _, ...rest } = state.unreadCounts;
    return {
      unreadCounts: rest,
      globalUnreadCount: Math.max(0, state.globalUnreadCount - count),
    };
  }),

  setPinnedSids: (sids) => set({ pinnedSids: sids }),

  togglePin: (sid) => set((state) => {
    const isPinned = state.pinnedSids.includes(sid);
    return {
      pinnedSids: isPinned
        ? state.pinnedSids.filter((s) => s !== sid)
        : [...state.pinnedSids, sid],
    };
  }),

  setContactSidebarOpen: (open) => set({ contactSidebarOpen: open }),

  toggleContactSidebar: () => set((state) => ({
    contactSidebarOpen: !state.contactSidebarOpen,
  })),

  setSidebarTab: (tab) => set({ sidebarTab: tab }),
}));
