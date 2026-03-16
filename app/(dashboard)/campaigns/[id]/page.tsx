'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Megaphone,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Send,
  Calendar,
  GitBranch,
  FileText,
  Edit3,
  MessageSquare,
  Mail,
  Copy,
  CalendarPlus,
  Eye,
  EyeOff,
  TrendingUp,
  User,
  Search,
  StopCircle,
} from 'lucide-react';
import type { Campaign, CampaignSend, DashboardUser } from '@/types/database';

interface CampaignWithCreator extends Campaign {
  creator_name: string | null;
  creator_email: string;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  sending: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  completed: 'bg-green-500/10 text-green-600 dark:text-green-400',
  paused: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const sendStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
    case 'delivered':
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    case 'queued':
    case 'pending':
      return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
    default:
      return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

function getMessageType(c: CampaignWithCreator): { label: string; icon: React.ReactNode } {
  if (c.flow_id) return { label: 'Flow', icon: <GitBranch className="h-3.5 w-3.5" /> };
  if (c.template_name) return { label: 'Template', icon: <FileText className="h-3.5 w-3.5" /> };
  return { label: 'Custom Message', icon: <Edit3 className="h-3.5 w-3.5" /> };
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [campaign, setCampaign] = useState<CampaignWithCreator | null>(null);
  const [sends, setSends] = useState<CampaignSend[]>([]);
  const [currentUser, setCurrentUser] = useState<DashboardUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [sendLogSearch, setSendLogSearch] = useState('');
  const [isStopping, setIsStopping] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const load = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [campaignRes, userRes] = await Promise.all([
        fetch(`/api/v1/campaigns/${id}`),
        fetch('/api/v1/auth/me'),
      ]);
      const campaignJson = await campaignRes.json();
      const userJson = await userRes.json();
      if (campaignJson.success) {
        setCampaign(campaignJson.data.campaign);
        setSends(campaignJson.data.sends ?? []);
      }
      if (userJson.success) {
        setCurrentUser(userJson.data);
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

  // Stats — each status is mutually exclusive, no double-counting
  const sentOnlyCount = sends.filter(s => s.status === 'sent').length;
  const deliveredCount = sends.filter(s => s.status === 'delivered').length;
  const failedCount = sends.filter(s => s.status === 'failed').length;
  const pendingCount = sends.filter(s => s.status === 'queued' || s.status === 'pending').length;
  const repliedCount = sends.filter(s => s.status === 'replied').length;
  const totalRecipients = campaign?.leads.length ?? 0;
  // "Reached" = sent + delivered + replied (message left our system and reached the user)
  const reachedCount = sentOnlyCount + deliveredCount + repliedCount;
  // "Not reached" = failed only (pending are still in progress, not failures)
  const notReachedCount = failedCount;

  // Filtered send log
  const filteredSends = useMemo(() => {
    if (!sendLogSearch) return sends;
    const q = sendLogSearch.toLowerCase();
    return sends.filter(s =>
      (s.lead_name?.toLowerCase().includes(q)) ||
      (isAdmin && s.lead_phone.includes(q)) ||
      s.status.includes(q)
    );
  }, [sends, sendLogSearch, isAdmin]);

  // Resend handlers
  const handleResendNow = async () => {
    if (!confirm('Resend this campaign to all recipients now?')) return;
    setIsResending(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/resend`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        router.push(`/campaigns/${json.data.id}`);
      }
    } finally {
      setIsResending(false);
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleTime) return;
    setIsResending(true);
    try {
      const scheduleAt = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
      const res = await fetch(`/api/v1/campaigns/${id}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_at: scheduleAt }),
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/campaigns/${json.data.id}`);
      }
    } finally {
      setIsResending(false);
      setShowReschedule(false);
    }
  };

  const handleStop = async () => {
    if (!confirm('Stop this campaign? Any remaining scheduled sends will not be processed.')) return;
    setIsStopping(true);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/stop`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        await load(true);
      }
    } finally {
      setIsStopping(false);
    }
  };

  // Action visibility
  const canResend = campaign ? ['completed', 'failed', 'paused'].includes(campaign.status) : false;
  const canReschedule = campaign ? ['scheduled', 'draft', 'failed'].includes(campaign.status) : false;
  const canStop = campaign ? ['scheduled', 'sending'].includes(campaign.status) : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-sm text-muted-foreground">Loading campaign...</p>
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

  const msgType = getMessageType(campaign);
  const creatorLabel = campaign.creator_name || campaign.creator_email || 'Unknown';
  const channelLabel = campaign.channel === 'email' ? 'Email' : 'WhatsApp';
  const channelIcon = campaign.channel === 'email'
    ? <Mail className="h-4 w-4 text-blue-500" />
    : <MessageSquare className="h-4 w-4 text-green-500" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">{campaign.name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ${statusColors[campaign.status] || statusColors.draft}`}>
                {campaign.status}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              {channelIcon}
              <span>{channelLabel} campaign</span>
              <span className="text-muted-foreground/40">·</span>
              <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={isRefreshing}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Reach & Delivery Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Recipients</p>
          <p className="mt-1 flex items-center gap-1.5 text-2xl font-bold">
            <Users className="h-4 w-4 text-muted-foreground" />
            {totalRecipients}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Reached</p>
          <p className="mt-1 text-2xl font-bold text-green-500">{reachedCount}</p>
          <ProgressBar value={reachedCount} max={totalRecipients} color="bg-green-500" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Not Reached</p>
          <p className="mt-1 text-2xl font-bold text-red-500">{notReachedCount}</p>
          <ProgressBar value={notReachedCount} max={totalRecipients} color="bg-red-500" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Delivered</p>
          <p className="mt-1 text-2xl font-bold text-blue-500">{deliveredCount}</p>
          <ProgressBar value={deliveredCount} max={totalRecipients} color="bg-blue-500" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/60">Replied</p>
          <p className="mt-1 text-2xl font-bold text-purple-500">{repliedCount}</p>
          <ProgressBar value={repliedCount} max={totalRecipients} color="bg-purple-500" />
        </div>
      </div>

      {/* Campaign Info + Actions — 2 column layout */}
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Left: Campaign Info */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            Campaign Details
          </h2>
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Channel</span>
              <span className="flex items-center gap-1.5 font-medium">
                {channelIcon} {channelLabel}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Message Type</span>
              <span className="flex items-center gap-1.5 font-medium">
                {msgType.icon} {msgType.label}
              </span>
            </div>
            {campaign.template_name && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Template</span>
                <span className="font-mono text-xs font-medium">{campaign.template_name}</span>
              </div>
            )}
            {campaign.flow_id && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Flow ID</span>
                <span className="font-mono text-xs font-medium">{campaign.flow_id.slice(0, 8)}...</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Schedule</span>
              <span className="font-medium capitalize">{campaign.schedule_type}</span>
            </div>
            {campaign.schedule_at && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Scheduled At</span>
                <span className="font-medium">{new Date(campaign.schedule_at).toLocaleString()}</span>
              </div>
            )}
            {campaign.frequency && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium">
                  Every {campaign.frequency_interval} {campaign.frequency}
                </span>
              </div>
            )}
            {campaign.send_times.length > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Send Times</span>
                <span className="font-medium">{campaign.send_times.join(', ')}</span>
              </div>
            )}
            {campaign.recurrence_end_at && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Ends At</span>
                <span className="font-medium">{new Date(campaign.recurrence_end_at).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Send Mode</span>
              <span className="font-medium capitalize">{campaign.send_mode.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Created By</span>
              <span className="flex items-center gap-1.5 font-medium">
                <User className="h-3 w-3 text-muted-foreground" />
                {creatorLabel}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Created</span>
              <span className="font-medium">{new Date(campaign.created_at).toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Last Updated</span>
              <span className="font-medium">{new Date(campaign.updated_at).toLocaleString()}</span>
            </div>
            {campaign.description && (
              <div className="col-span-2 flex justify-between gap-4">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium">{campaign.description}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Actions
            </h2>
            <div className="space-y-2">
              {/* Stop — only for scheduled/sending */}
              {canStop && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleStop}
                  disabled={isStopping}
                >
                  <StopCircle className="mr-2 h-3.5 w-3.5" />
                  {isStopping ? 'Stopping...' : 'Stop Campaign'}
                </Button>
              )}

              {/* Resend Now — only for completed/failed/paused */}
              {canResend && (
                <Button
                  variant="default"
                  size="sm"
                  className="w-full justify-start"
                  onClick={handleResendNow}
                  disabled={isResending}
                >
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  {isResending ? 'Creating...' : 'Resend Now'}
                </Button>
              )}

              {/* Reschedule — only for scheduled/draft (not yet triggered) */}
              {canReschedule && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setShowReschedule(!showReschedule)}
                  >
                    <CalendarPlus className="mr-2 h-3.5 w-3.5" />
                    Reschedule
                  </Button>

                  {showReschedule && (
                    <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Date</label>
                          <Input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-muted-foreground">Time</label>
                          <Input
                            type="time"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={handleReschedule}
                        disabled={isResending || !rescheduleDate || !rescheduleTime}
                      >
                        <Send className="mr-2 h-3 w-3" />
                        {isResending ? 'Scheduling...' : 'Schedule Resend'}
                      </Button>
                    </div>
                  )}
                </>
              )}

              {/* No actions available */}
              {!canStop && !canResend && !canReschedule && (
                <p className="text-xs text-muted-foreground">
                  No actions available for this campaign status.
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Delivery Breakdown
            </h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Sent
                </span>
                <span className="font-medium tabular-nums">{sentOnlyCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Delivered
                </span>
                <span className="font-medium tabular-nums">{deliveredCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                  Failed
                </span>
                <span className="font-medium tabular-nums">{failedCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  Pending / Queued
                </span>
                <span className="font-medium tabular-nums">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  Replied
                </span>
                <span className="font-medium tabular-nums">{repliedCount}</span>
              </div>
              {sends.length > 0 && (
                <div className="mt-2 border-t border-border pt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      Success Rate
                    </span>
                    <span className="font-bold">
                      {Math.round((reachedCount / sends.length) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Send Log */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            Send Log ({sends.length})
          </h2>
          <div className="flex items-center gap-2">
            {sends.length > 0 && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search log..."
                  value={sendLogSearch}
                  onChange={(e) => setSendLogSearch(e.target.value)}
                  className="h-7 w-48 pl-7 text-xs"
                />
              </div>
            )}
          </div>
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
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 border-b border-border bg-muted/30 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <span>Recipient</span>
              <span className="w-20 text-center">Status</span>
              {isAdmin && <span className="w-28 text-center">Message ID</span>}
              <span className="w-24 text-right">Time</span>
            </div>

            <div className="max-h-[500px] divide-y divide-border overflow-y-auto">
              {filteredSends.map((send, index) => (
                <div
                  key={send.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] items-start gap-4 px-5 py-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {sendStatusIcon(send.status)}
                    <div className="min-w-0">
                      {/* Agents see name only; admins see name + phone */}
                      {isAdmin ? (
                        <>
                          <p className="truncate text-sm font-medium">
                            {send.lead_name || send.lead_phone}
                          </p>
                          {send.lead_name && send.lead_name !== send.lead_phone && (
                            <p className="text-xs text-muted-foreground">{send.lead_phone}</p>
                          )}
                        </>
                      ) : (
                        <p className="truncate text-sm font-medium">
                          {send.lead_name || `Recipient ${index + 1}`}
                        </p>
                      )}
                      {send.error && (
                        <p className="mt-0.5 rounded bg-red-500/10 px-2 py-0.5 text-[11px] text-red-500">
                          {send.error}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex w-20 justify-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      send.status === 'sent' || send.status === 'delivered'
                        ? 'bg-green-500/10 text-green-500'
                        : send.status === 'failed'
                          ? 'bg-red-500/10 text-red-500'
                          : send.status === 'replied'
                            ? 'bg-purple-500/10 text-purple-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {send.status}
                    </span>
                  </div>

                  {/* Provider message ID (admin only) */}
                  {isAdmin && (
                    <div className="w-28 text-center">
                      {send.provider_message_id ? (
                        <p className="truncate font-mono text-[10px] text-muted-foreground" title={send.provider_message_id}>
                          {send.provider_message_id.slice(-12)}
                        </p>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </div>
                  )}

                  {/* Time */}
                  <div className="w-24 text-right">
                    {send.sent_at ? (
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(send.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {sendLogSearch && filteredSends.length === 0 && (
              <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                No sends match your search.
              </div>
            )}
          </>
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
