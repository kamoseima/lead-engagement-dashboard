'use client';

import { useState, useEffect } from 'react';
import { X, Phone, Mail, Activity, BarChart3, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreBadge, SegmentBadge } from './score-badge';
import type { Lead, LeadActivity, LeadPipelineStage, ActivityType } from '@/types/database';

const STAGES: LeadPipelineStage[] = ['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost'];

const ACTIVITY_ICONS: Record<ActivityType, { label: string; color: string }> = {
  sent: { label: 'Sent', color: 'text-blue-400' },
  delivered: { label: 'Delivered', color: 'text-green-400' },
  replied: { label: 'Replied', color: 'text-emerald-400' },
  clicked: { label: 'Clicked', color: 'text-purple-400' },
  failed: { label: 'Failed', color: 'text-red-400' },
  bounced: { label: 'Bounced', color: 'text-orange-400' },
};

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onStageChange: (leadId: string, stage: LeadPipelineStage) => void;
}

export function LeadDetailPanel({ lead, onClose, onStageChange }: LeadDetailPanelProps) {
  const [tab, setTab] = useState<'overview' | 'activity' | 'score'>('overview');
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [scoreBreakdown, setScoreBreakdown] = useState<{ type: ActivityType; count: number; points: number }[]>([]);

  useEffect(() => {
    if (tab === 'activity') {
      fetch(`/api/v1/leads/${lead.id}/activity`)
        .then(r => r.json())
        .then(json => { if (json.success) setActivities(json.data); });
    } else if (tab === 'score') {
      fetch(`/api/v1/leads/${lead.id}/score`)
        .then(r => r.json())
        .then(json => { if (json.success) setScoreBreakdown(json.data.byType); });
    }
  }, [tab, lead.id]);

  return (
    <div className="flex h-full w-96 flex-col border-l border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold">Lead Details</h2>
        <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Lead Info */}
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{lead.name || 'Unknown'}</h3>
          <ScoreBadge score={lead.score} segment={lead.segment} />
        </div>
        <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>
          {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <SegmentBadge segment={lead.segment} />
          {lead.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px]">
              <Tag className="h-2.5 w-2.5" />{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Stage Selector */}
      <div className="border-b border-border px-4 py-3">
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Pipeline Stage</label>
        <div className="flex flex-wrap gap-1">
          {STAGES.map(stage => (
            <button
              key={stage}
              onClick={() => onStageChange(lead.id, stage)}
              className={`rounded-md px-2 py-1 text-xs font-medium capitalize transition-colors ${
                lead.pipeline_stage === stage
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {stage}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: 'overview' as const, label: 'Overview', icon: BarChart3 },
          { key: 'activity' as const, label: 'Activity', icon: Activity },
          { key: 'score' as const, label: 'Score', icon: BarChart3 },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              tab === t.key ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="h-3 w-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'overview' && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">First Seen</span>
              <span>{new Date(lead.first_seen_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Activity</span>
              <span>{lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleString() : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Score</span>
              <span className="font-bold">{lead.score}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Segment</span>
              <SegmentBadge segment={lead.segment} />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stage</span>
              <span className="capitalize">{lead.pipeline_stage}</span>
            </div>
          </div>
        )}

        {tab === 'activity' && (
          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No activity yet</p>
            ) : (
              activities.map(a => {
                const info = ACTIVITY_ICONS[a.activity_type];
                return (
                  <div key={a.id} className="flex items-start gap-3 text-sm">
                    <div className={`mt-0.5 rounded-full p-1 ${info.color}`}>
                      <Activity className="h-3 w-3" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{info.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.source} &middot; {new Date(a.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'score' && (
          <div className="space-y-2">
            {scoreBreakdown.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No scoring data</p>
            ) : (
              scoreBreakdown.map(b => (
                <div key={b.type} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium capitalize">{b.type}</span>
                    <span className="ml-2 text-xs text-muted-foreground">&times;{b.count}</span>
                  </div>
                  <span className={`font-bold ${b.points >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {b.points > 0 ? '+' : ''}{b.points}
                  </span>
                </div>
              ))
            )}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm font-bold">
              <span>Total Score</span>
              <span>{lead.score}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
