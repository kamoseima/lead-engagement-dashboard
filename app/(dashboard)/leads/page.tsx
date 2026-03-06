'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  LayoutGrid,
  List,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';
import { PipelineColumn } from '@/components/leads/pipeline-column';
import { LeadDetailPanel } from '@/components/leads/lead-detail-panel';
import { ScoreBadge, SegmentBadge } from '@/components/leads/score-badge';
import type { Lead, LeadPipelineStage, LeadSegment } from '@/types/database';

const STAGES: LeadPipelineStage[] = ['new', 'contacted', 'engaged', 'qualified', 'converted', 'lost'];
const SEGMENTS: LeadSegment[] = ['hot', 'warm', 'cold', 'unresponsive'];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'table'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [stage, setStage] = useState('');

  const pageSize = 200; // fetch more for kanban view

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (search) params.set('search', search);
      if (segment) params.set('segment', segment);
      if (stage) params.set('stage', stage);

      const res = await fetch(`/api/v1/leads?${params}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data.leads);
        setTotal(json.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, segment, stage]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleStageChange = async (leadId: string, newStage: LeadPipelineStage) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l));
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => prev ? { ...prev, pipeline_stage: newStage } : null);
    }

    await fetch(`/api/v1/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pipeline_stage: newStage }),
    });
  };

  const handleDrop = (leadId: string, newStage: LeadPipelineStage) => {
    handleStageChange(leadId, newStage);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkStage = async (newStage: LeadPipelineStage) => {
    const ids = Array.from(selectedIds);
    await fetch('/api/v1/leads/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'move_stage', lead_ids: ids, value: newStage }),
    });
    setSelectedIds(new Set());
    fetchLeads();
  };

  const totalPages = Math.ceil(total / pageSize);

  // Group leads by stage for kanban
  const leadsByStage: Record<LeadPipelineStage, Lead[]> = {
    new: [], contacted: [], engaged: [], qualified: [], converted: [], lost: [],
  };
  for (const lead of leads) {
    leadsByStage[lead.pipeline_stage]?.push(lead);
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Leads</h1>
            <p className="text-sm text-muted-foreground">{total} lead{total !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border">
            <button
              onClick={() => setView('kanban')}
              className={`rounded-l-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView('table')}
              className={`rounded-r-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-60 pl-8"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => { setSegment(''); setPage(1); }}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${!segment ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            All
          </button>
          {SEGMENTS.map(s => (
            <button
              key={s}
              onClick={() => { setSegment(segment === s ? '' : s); setPage(1); }}
              className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors ${segment === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {view === 'table' && (
          <select
            value={stage}
            onChange={e => { setStage(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All stages</option>
            {STAGES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
        )}
        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            {STAGES.map(s => (
              <button
                key={s}
                onClick={() => handleBulkStage(s)}
                className="rounded-md bg-muted px-2 py-1 text-[10px] font-medium capitalize text-muted-foreground hover:bg-muted/80"
              >
                → {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          {view === 'kanban' ? (
            <div className="flex gap-3 pb-4">
              {STAGES.map(stg => (
                <PipelineColumn
                  key={stg}
                  stage={stg}
                  leads={leadsByStage[stg]}
                  onLeadClick={setSelectedLead}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left">
                    <th className="w-8 px-3 py-3"></th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Name</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Phone</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Score</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Segment</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Stage</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Last Activity</th>
                    <th className="px-3 py-3 font-medium text-muted-foreground">Tags</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-3 py-12 text-center text-muted-foreground">
                        {loading ? 'Loading...' : 'No leads found'}
                      </td>
                    </tr>
                  ) : (
                    leads.map(lead => (
                      <tr
                        key={lead.id}
                        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="px-3 py-2.5" onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                          <div className={`flex h-4 w-4 items-center justify-center rounded border ${selectedIds.has(lead.id) ? 'border-primary bg-primary' : 'border-border'}`}>
                            {selectedIds.has(lead.id) && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-medium">{lead.name || 'Unknown'}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{lead.phone}</td>
                        <td className="px-3 py-2.5"><ScoreBadge score={lead.score} segment={lead.segment} /></td>
                        <td className="px-3 py-2.5"><SegmentBadge segment={lead.segment} /></td>
                        <td className="px-3 py-2.5 capitalize">{lead.pipeline_stage}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {lead.last_activity_at ? new Date(lead.last_activity_at).toLocaleString() : '-'}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            {lead.tags.slice(0, 2).map(t => (
                              <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{t}</span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-2">
                  <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedLead && (
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onStageChange={handleStageChange}
          />
        )}
      </div>
    </div>
  );
}
