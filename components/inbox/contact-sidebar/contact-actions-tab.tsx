'use client';

import { useState, useEffect } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import {
  UserPlus,
  CheckCircle,
  Clock,
  ArrowUpRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { Conversation, ConversationStatus, ConversationPriority } from '@/types/inbox';
import type { DashboardUser } from '@/types/database';

interface ContactActionsTabProps {
  conversation: Conversation;
}

export function ContactActionsTab({ conversation }: ContactActionsTabProps) {
  const { updateConversationInList } = useInboxStore();
  const [agents, setAgents] = useState<DashboardUser[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Fetch org agents for assignment dropdown
    // This would use a dedicated endpoint, for now we keep it simple
  }, []);

  const handleStatusChange = async (status: ConversationStatus) => {
    setActionLoading(status);
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
    } catch { /* */ }
    finally { setActionLoading(null); }
  };

  const handlePriorityChange = async (priority: ConversationPriority) => {
    setActionLoading(`priority-${priority}`);
    try {
      const res = await fetch(`/api/v1/inbox/conversations/${conversation.twilio_conversation_sid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority }),
      });
      const json = await res.json();
      if (json.success) {
        updateConversationInList(conversation.twilio_conversation_sid, { priority });
      }
    } catch { /* */ }
    finally { setActionLoading(null); }
  };

  const statusActions: { status: ConversationStatus; icon: React.ElementType; label: string; className: string }[] = [
    { status: 'open', icon: RefreshCw, label: 'Reopen', className: 'text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.12)]' },
    { status: 'resolved', icon: CheckCircle, label: 'Resolve', className: 'text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.12)]' },
    { status: 'snoozed', icon: Clock, label: 'Snooze', className: 'text-[hsl(var(--channel-email))] hover:bg-[hsl(var(--channel-email)/0.12)]' },
    { status: 'escalated', icon: ArrowUpRight, label: 'Escalate', className: 'text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.12)]' },
  ];

  const priorityOptions: { value: ConversationPriority; label: string }[] = [
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'normal', label: 'Normal' },
    { value: 'low', label: 'Low' },
  ];

  return (
    <div className="divide-y divide-border">
      {/* Status actions */}
      <div className="p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Change Status
        </h3>
        <div className="space-y-1">
          {statusActions
            .filter(a => a.status !== conversation.status)
            .map(action => {
              const Icon = action.icon;
              return (
                <button
                  key={action.status}
                  onClick={() => handleStatusChange(action.status)}
                  disabled={actionLoading !== null}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${action.className} disabled:opacity-50`}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                  {actionLoading === action.status && (
                    <RefreshCw className="ml-auto h-3 w-3 animate-spin" />
                  )}
                </button>
              );
            })}
        </div>
      </div>

      {/* Priority */}
      <div className="p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Priority
        </h3>
        <select
          value={conversation.priority}
          onChange={(e) => handlePriorityChange(e.target.value as ConversationPriority)}
          disabled={actionLoading !== null}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none disabled:opacity-50"
        >
          {priorityOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Assign */}
      <div className="p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Assignment
        </h3>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-foreground">
            {conversation.assigned_agent_name || conversation.assigned_agent_id || 'Unassigned'}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Assignment management coming soon
        </p>
      </div>
    </div>
  );
}
