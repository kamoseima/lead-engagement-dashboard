import type { Lead } from '@/types/database';
import { ScoreBadge, SegmentBadge } from './score-badge';
import { Phone } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export function LeadCard({ lead, onClick, draggable, onDragStart }: LeadCardProps) {
  return (
    <div
      className="cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {lead.name || 'Unknown'}
          </p>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" />
            <span className="truncate">{lead.phone}</span>
          </div>
        </div>
        <ScoreBadge score={lead.score} segment={lead.segment} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <SegmentBadge segment={lead.segment} />
        {lead.last_activity_at && (
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(lead.last_activity_at)}
          </span>
        )}
      </div>
      {lead.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
          {lead.tags.length > 3 && (
            <span className="text-[10px] text-muted-foreground">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
