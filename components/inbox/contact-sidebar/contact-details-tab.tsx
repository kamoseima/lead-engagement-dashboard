'use client';

import { ChannelBadge } from '../shared/channel-badge';
import { StatusBadge } from '../shared/status-badge';
import { PriorityBadge } from '../shared/priority-badge';
import { User, Clock, Calendar, Hash } from 'lucide-react';
import type { Conversation } from '@/types/inbox';

interface ContactDetailsTabProps {
  conversation: Conversation;
}

function DetailRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </div>
  );
}

export function ContactDetailsTab({ conversation }: ContactDetailsTabProps) {
  return (
    <div className="divide-y divide-border">
      {/* Contact card */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {conversation.contact_identifier}
            </p>
            <div className="mt-0.5">
              <ChannelBadge channel={conversation.channel} showLabel />
            </div>
          </div>
        </div>
      </div>

      {/* Conversation metadata */}
      <div className="px-4 py-2">
        <DetailRow icon={Hash} label="Status">
          <StatusBadge status={conversation.status} size="md" />
        </DetailRow>

        <DetailRow icon={Hash} label="Priority">
          <PriorityBadge priority={conversation.priority} showLabel />
        </DetailRow>

        {conversation.assigned_agent_id && (
          <DetailRow icon={User} label="Assigned to">
            <p className="text-sm text-foreground">
              {conversation.assigned_agent_name || conversation.assigned_agent_id}
            </p>
          </DetailRow>
        )}

        {conversation.snoozed_until && (
          <DetailRow icon={Clock} label="Snoozed until">
            <p className="text-sm text-foreground">
              {new Date(conversation.snoozed_until).toLocaleString()}
            </p>
          </DetailRow>
        )}

        <DetailRow icon={Calendar} label="Created">
          <p className="text-sm text-foreground">
            {new Date(conversation.created_at).toLocaleDateString(undefined, {
              year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </p>
        </DetailRow>

        <DetailRow icon={Clock} label="Last message">
          <p className="text-sm text-foreground">
            {conversation.last_message_at
              ? new Date(conversation.last_message_at).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })
              : 'None'
            }
          </p>
        </DetailRow>

        <DetailRow icon={Hash} label="Conversation SID">
          <p className="truncate text-xs font-mono text-muted-foreground">
            {conversation.twilio_conversation_sid}
          </p>
        </DetailRow>
      </div>
    </div>
  );
}
