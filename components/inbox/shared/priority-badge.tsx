'use client';

import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowUp, Minus, ArrowDown } from 'lucide-react';
import type { ConversationPriority } from '@/types/inbox';

const priorityConfig: Record<ConversationPriority, { icon: React.ElementType; label: string; className: string }> = {
  urgent: { icon: AlertTriangle, label: 'Urgent', className: 'text-[hsl(var(--destructive))]' },
  high: { icon: ArrowUp, label: 'High', className: 'text-[hsl(var(--warning))]' },
  normal: { icon: Minus, label: 'Normal', className: 'text-muted-foreground' },
  low: { icon: ArrowDown, label: 'Low', className: 'text-muted-foreground/60' },
};

interface PriorityBadgeProps {
  priority: ConversationPriority;
  showLabel?: boolean;
}

export function PriorityBadge({ priority, showLabel = false }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.normal;
  const Icon = config.icon;

  if (priority === 'normal' && !showLabel) return null;

  return (
    <span className={cn('inline-flex items-center gap-0.5', config.className)} title={config.label}>
      <Icon className="h-3 w-3" />
      {showLabel && <span className="text-[10px] font-medium">{config.label}</span>}
    </span>
  );
}
