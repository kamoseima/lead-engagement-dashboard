'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Megaphone,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import type { Campaign, CampaignSend } from '@/types/database';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-yellow-500/10 text-yellow-400',
  sending: 'bg-blue-500/10 text-blue-400',
  completed: 'bg-green-500/10 text-green-400',
  paused: 'bg-orange-500/10 text-orange-400',
  failed: 'bg-red-500/10 text-red-400',
};

const sendStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
    case 'delivered':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-400" />;
    case 'queued':
    case 'pending':
      return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}`);
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data.campaign);
        setSends(json.data.sends ?? []);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const sentCount = sends.filter(s => s.status === 'sent' || s.status === 'delivered').length;
  const failedCount = sends.filter(s => s.status === 'failed').length;
  const pendingCount = sends.filter(s => s.status === 'queued' || s.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading campaign…</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Campaign not found.</p>
        <Button variant="ghost" className="mt-4" onClick={() => router.push('/campaigns')}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{campaign.name}</h1>
            <p className="text-xs text-muted-foreground">Campaign details &amp; send log</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Status</p>
          <span className={`mt-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[campaign.status] || statusColors.draft}`}>
            {campaign.status}
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Recipients</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
            <Users className="h-4 w-4 text-muted-foreground" />
            {campaign.leads.length}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Sent</p>
          <p className="mt-1 text-2xl font-bold text-green-400">{sentCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">Failed</p>
          <p className="mt-1 text-2xl font-bold text-red-400">{failedCount}</p>
        </div>
      </div>

      {/* Campaign Info */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
          Campaign Info
        </h2>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {campaign.template_name && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Template</span>
              <span className="font-mono text-xs font-medium">{campaign.template_name}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Schedule</span>
            <span className="font-medium">{campaign.schedule_type}</span>
          </div>
          {campaign.schedule_at && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Scheduled at</span>
              <span className="font-medium">{new Date(campaign.schedule_at).toLocaleString()}</span>
            </div>
          )}
          {campaign.frequency && (
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Frequency</span>
              <span className="font-medium">Every {campaign.frequency_interval} {campaign.frequency}</span>
            </div>
          )}
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Created</span>
            <span className="font-medium">{new Date(campaign.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Send Log */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            Send Log ({sends.length})
          </h2>
        </div>

        {sends.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Megaphone className="mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {campaign.status === 'scheduled'
                ? 'No sends yet — campaign is scheduled and will be processed by the cron job.'
                : 'No send records found.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sends.map((send) => (
              <div key={send.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="flex items-center gap-2.5">
                  {sendStatusIcon(send.status)}
                  <div>
                    <p className="text-sm font-medium">{send.lead_phone}</p>
                    {send.lead_name && send.lead_name !== send.lead_phone && (
                      <p className="text-xs text-muted-foreground">{send.lead_name}</p>
                    )}
                    {send.error && (
                      <p className="mt-0.5 rounded bg-red-500/10 px-2 py-0.5 text-[11px] text-red-400">
                        {send.error}
                      </p>
                    )}
                    {send.provider_message_id && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        {send.provider_message_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    send.status === 'sent' || send.status === 'delivered'
                      ? 'bg-green-500/10 text-green-400'
                      : send.status === 'failed'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {send.status}
                  </span>
                  {send.sent_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(send.sent_at).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pendingCount > 0 && (
          <div className="border-t border-border px-5 py-3">
            <p className="text-[11px] text-muted-foreground">
              {pendingCount} send{pendingCount !== 1 ? 's' : ''} still queued — refresh in a moment.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
