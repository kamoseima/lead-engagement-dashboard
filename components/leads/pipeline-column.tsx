import type { Lead, LeadPipelineStage } from '@/types/database';
import { LeadCard } from './lead-card';

const STAGE_LABELS: Record<LeadPipelineStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  engaged: 'Engaged',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
};

const STAGE_COLORS: Record<LeadPipelineStage, string> = {
  new: 'bg-slate-500',
  contacted: 'bg-blue-500',
  engaged: 'bg-amber-500',
  qualified: 'bg-purple-500',
  converted: 'bg-green-500',
  lost: 'bg-red-500',
};

interface PipelineColumnProps {
  stage: LeadPipelineStage;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onDrop: (leadId: string, stage: LeadPipelineStage) => void;
}

export function PipelineColumn({ stage, leads, onLeadClick, onDrop }: PipelineColumnProps) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary/30');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary/30');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary/30');
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) onDrop(leadId, stage);
  };

  return (
    <div
      className="flex w-64 shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-shadow"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <div className={`h-2 w-2 rounded-full ${STAGE_COLORS[stage]}`} />
        <span className="text-sm font-medium">{STAGE_LABELS[stage]}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {leads.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">No leads</p>
        ) : (
          leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={() => onLeadClick(lead)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', lead.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
