'use client';

import { useInboxStore } from '@/lib/stores/inbox-store';
import { ChannelBadge } from '../shared/channel-badge';
import { StatusBadge } from '../shared/status-badge';
import { PriorityBadge } from '../shared/priority-badge';
import { CheckCircle, Clock, ArrowUpRight, Pin, PanelRightClose, PanelRightOpen } from 'lucide-react';
import type { Conversation, ConversationStatus } from '@/types/inbox';

interface ThreadHeaderProps {
  conversation: Conversation;
}

export function ThreadHeader({ conversation }: ThreadHeaderProps) {
  const { updateConversationInList, pinnedSids, togglePin, contactSidebarOpen, toggleContactSidebar } = useInboxStore();
  const isPinned = pinnedSids.includes(conversation.twilio_conversation_sid);

  const handleStatusChange = async (status: ConversationStatus) => {
    try {
      const res = await fetch(`/api/v1/inbox/conversations/${conversation.twilio_conversation_sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        updateConversationInList(conversation.twilio_conversation_sid, { status });
      }
    } catch { /* silently fail */ }
  };

  const handlePin = async () => {
    try {
      const method = isPinned ? 'DELETE' : 'POST';
      await fetch('/api/v1/inbox/pins', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation_sid: conversation.twilio_conversation_sid }),
      });
      togglePin(conversation.twilio_conversation_sid);
    } catch { /* silently fail */ }
  };

  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-foreground">
              {conversation.contact_identifier}
            </h2>
            <ChannelBadge channel={conversation.channel} showLabel />
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusBadge status={conversation.status} />
            <PriorityBadge priority={conversation.priority} showLabel />
            {conversation.assigned_agent_name && (
              <span className="text-[10px] text-muted-foreground">
                Assigned to {conversation.assigned_agent_name}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handlePin}
          title={isPinned ? 'Unpin' : 'Pin'}
          className={`rounded-md p-1.5 transition-colors ${isPinned ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          <Pin className="h-4 w-4" />
        </button>
        {conversation.status !== 'resolved' && (
          <button
            onClick={() => handleStatusChange('resolved')}
            title="Resolve"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--success)/0.12)] hover:text-[hsl(var(--success))] transition-colors"
          >
            <CheckCircle className="h-4 w-4" />
          </button>
        )}
        {conversation.status !== 'snoozed' && (
          <button
            onClick={() => handleStatusChange('snoozed')}
            title="Snooze"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Clock className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => handleStatusChange('escalated')}
          title="Escalate"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-[hsl(var(--destructive)/0.12)] hover:text-[hsl(var(--destructive))] transition-colors"
        >
          <ArrowUpRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          onClick={toggleContactSidebar}
          title={contactSidebarOpen ? 'Hide contact details' : 'Show contact details'}
          className={`rounded-md p-1.5 transition-colors ${contactSidebarOpen ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
        >
          {contactSidebarOpen ? (
            <PanelRightClose className="h-4 w-4" />
          ) : (
            <PanelRightOpen className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
