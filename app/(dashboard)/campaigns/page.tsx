'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Megaphone,
  Plus,
  Search,
  ChevronRight,
  Users,
  Mail,
  MessageSquare,
  GitBranch,
  FileText,
  Edit3,
  Calendar,
  Clock,
  Filter,
  X,
} from 'lucide-react';
import type { Campaign, CampaignStatus, CampaignChannel } from '@/types/database';
import Link from 'next/link';

interface CampaignSendStats {
  total_sends: number;
  reached: number;
  failed: number;
  pending: number;
}

interface CampaignWithCreator extends Campaign {
  creator_name: string | null;
  creator_email: string;
  send_stats: CampaignSendStats;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  sending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
  paused: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
};

const channelLabels: Record<string, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
};

function getMessageType(c: CampaignWithCreator): { label: string; icon: React.ReactNode } {
  if (c.flow_id) return { label: 'Flow', icon: <GitBranch className="h-3 w-3" /> };
  if (c.template_name) return { label: 'Template', icon: <FileText className="h-3 w-3" /> };
  return { label: 'Custom', icon: <Edit3 className="h-3 w-3" /> };
}

const ALL_STATUSES: CampaignStatus[] = ['draft', 'scheduled', 'sending', 'completed', 'paused', 'failed'];
const ALL_CHANNELS: CampaignChannel[] = ['whatsapp', 'email'];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithCreator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<CampaignChannel | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/campaigns');
      const json = await res.json();
      if (json.success) setCampaigns(json.data);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
      return true;
    });
  }, [campaigns, searchQuery, statusFilter, channelFilter]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (channelFilter !== 'all' ? 1 : 0);

  // Stats — using real send data from campaign_sends
  const totalCampaigns = campaigns.length;
  const activeCampaigns = campaigns.filter(c => c.status === 'sending' || c.status === 'scheduled').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  const totalReach = campaigns.reduce((sum, c) => sum + c.send_stats.reached, 0);
  const failedCampaigns = campaigns.filter(c => c.status === 'failed').length;
  const totalFailedSends = campaigns.reduce((sum, c) => sum + c.send_stats.failed, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, manage, and track WhatsApp &amp; email campaigns.
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-3 sm:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Total</p>
          <p className="mt-1 text-2xl font-bold">{totalCampaigns}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Active</p>
          <p className="mt-1 text-2xl font-bold text-blue-500">{activeCampaigns}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Completed</p>
          <p className="mt-1 text-2xl font-bold text-green-500">{completedCampaigns}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Reached</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold text-green-500">
            <Users className="h-4 w-4 text-muted-foreground" />
            {totalReach}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{failedCampaigns}</p>
          {totalFailedSends > 0 && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">{totalFailedSends} send{totalFailedSends !== 1 ? 's' : ''} failed</p>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="mr-2 h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary-foreground text-[10px] font-bold text-primary">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Bar */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
            {/* Status */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Status</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {ALL_STATUSES.map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors ${
                      statusFilter === s ? 'bg-primary text-primary-foreground' : `${statusColors[s]} hover:opacity-80`
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Channel */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Channel</label>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setChannelFilter('all')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    channelFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {ALL_CHANNELS.map(ch => (
                  <button
                    key={ch}
                    onClick={() => setChannelFilter(ch)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                      channelFilter === ch ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {channelIcons[ch]}
                    {channelLabels[ch]}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => { setStatusFilter('all'); setChannelFilter('all'); }}
                className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || activeFilterCount > 0) && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Campaigns List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading campaigns...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery || activeFilterCount > 0
              ? 'No campaigns match your filters.'
              : 'No campaigns yet. Create your first one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(campaign => {
            const msgType = getMessageType(campaign);
            const creatorLabel = campaign.creator_name || campaign.creator_email || 'Unknown';

            return (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Channel icon */}
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    campaign.channel === 'email' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                  }`}>
                    {channelIcons[campaign.channel] || <Megaphone className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{campaign.name}</h3>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {/* Channel badge */}
                      <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium">
                        {channelLabels[campaign.channel]}
                      </span>

                      {/* Message type */}
                      <span className="flex items-center gap-1">
                        {msgType.icon}
                        {msgType.label}
                      </span>

                      {/* Recipients */}
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {campaign.leads.length} recipient{campaign.leads.length !== 1 ? 's' : ''}
                      </span>

                      {/* Real send stats */}
                      {campaign.send_stats.total_sends > 0 && (
                        <span className="flex items-center gap-1">
                          <span className="text-green-500">{campaign.send_stats.reached} reached</span>
                          {campaign.send_stats.failed > 0 && (
                            <span className="text-red-500">/ {campaign.send_stats.failed} failed</span>
                          )}
                        </span>
                      )}

                      {/* Schedule info */}
                      {campaign.schedule_type === 'recurring' && (
                        <span className="flex items-center gap-1 text-blue-500">
                          <Clock className="h-3 w-3" />
                          Recurring
                        </span>
                      )}
                      {campaign.schedule_at && campaign.schedule_type === 'once' && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(campaign.schedule_at).toLocaleDateString()}
                        </span>
                      )}

                      {/* Creator */}
                      <span className="text-muted-foreground/50">
                        by {creatorLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 pl-4">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusColors[campaign.status] || statusColors.draft}`}>
                    {campaign.status}
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:block">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
