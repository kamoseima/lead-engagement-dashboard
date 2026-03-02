'use client';

import { useInboxStore } from '@/lib/stores/inbox-store';
import { cn } from '@/lib/utils';
import type { ConversationStatus } from '@/types/inbox';

const statusTabs: { value: ConversationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'waiting_on_agent', label: 'Mine' },
  { value: 'waiting_on_customer', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
];

export function ConversationFilters() {
  const { statusFilter, channelFilter, setFilter } = useInboxStore();

  return (
    <div className="border-b border-border">
      {/* Status tabs */}
      <div className="flex gap-0.5 overflow-x-auto px-2 py-1.5">
        {statusTabs.map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter('status', tab.value)}
            className={cn(
              'whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              statusFilter === tab.value
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Channel filter */}
      <div className="flex items-center gap-2 px-3 pb-2">
        <select
          value={channelFilter}
          onChange={(e) => setFilter('channel', e.target.value)}
          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:border-primary focus:outline-none"
        >
          <option value="all">All channels</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="sms">SMS</option>
          <option value="email">Email</option>
          <option value="voice">Voice</option>
        </select>
      </div>
    </div>
  );
}
