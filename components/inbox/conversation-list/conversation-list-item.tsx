'use client';

import { cn } from '@/lib/utils';
import { Pin } from 'lucide-react';
import { ChannelBadge } from '../shared/channel-badge';
import { PriorityBadge } from '../shared/priority-badge';
import { RelativeTime } from '../shared/relative-time';
import { useInboxStore } from '@/lib/stores/inbox-store';
import type { Conversation } from '@/types/inbox';

interface ConversationListItemProps {
  conversation: Conversation;
  isSelected: boolean;
  isPinned: boolean;
  onClick: () => void;
}

export function ConversationListItem({ conversation, isSelected, isPinned, onClick }: ConversationListItemProps) {
  const unreadCounts = useInboxStore(s => s.unreadCounts);
  const unread = unreadCounts[conversation.twilio_conversation_sid] || 0;

  const contactDisplay = conversation.contact_identifier || 'Unknown';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors',
        isSelected
          ? 'bg-primary/10 border border-primary/20'
          : 'hover:bg-muted border border-transparent'
      )}
    >
      {/* Channel badge */}
      <div className="mt-0.5 shrink-0">
        <ChannelBadge channel={conversation.channel} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              'truncate text-sm',
              unread > 0 ? 'font-semibold text-foreground' : 'font-medium text-foreground'
            )}>
              {contactDisplay}
            </span>
            {isPinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
            <PriorityBadge priority={conversation.priority} />
          </div>
          <RelativeTime
            date={conversation.last_message_at}
            className="shrink-0 text-[10px] text-muted-foreground"
          />
        </div>

        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p className={cn(
            'truncate text-xs',
            unread > 0 ? 'text-foreground/80' : 'text-muted-foreground'
          )}>
            {conversation.last_message_preview || 'No messages yet'}
          </p>

          {unread > 0 && (
            <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
