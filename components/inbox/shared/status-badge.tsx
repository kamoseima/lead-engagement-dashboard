'use client';

import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/types/inbox';

const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
  open: { label: 'Open', className: 'text-[hsl(var(--success))] bg-[hsl(var(--success)/0.12)]' },
  waiting_on_customer: { label: 'Waiting on customer', className: 'text-[hsl(var(--warning))] bg-[hsl(var(--warning)/0.12)]' },
  waiting_on_agent: { label: 'Waiting on agent', className: 'text-[hsl(var(--channel-sms))] bg-[hsl(var(--channel-sms)/0.12)]' },
  resolved: { label: 'Resolved', className: 'text-muted-foreground bg-muted' },
  snoozed: { label: 'Snoozed', className: 'text-[hsl(var(--channel-email))] bg-[hsl(var(--channel-email)/0.12)]' },
  archived: { label: 'Archived', className: 'text-muted-foreground bg-muted' },
  escalated: { label: 'Escalated', className: 'text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.12)]' },
};

interface StatusBadgeProps {
  status: ConversationStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.open;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
