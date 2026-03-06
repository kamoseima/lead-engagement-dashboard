'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from 'lucide-react';
import type { WebhookEvent } from '@/types/database';

// ── Helpers ─────────────────────────────────────────────────

const EVENT_TYPES = [
  'message.received',
  'message.sent',
  'message.delivered',
  'message.failed',
  'message.bounced',
  'template.button_clicked',
  'template.list_selected',
];

const CHANNELS = ['email', 'sms', 'whatsapp'];
const STATUSES = ['success', 'error', 'ignored', 'pending'];

function eventTypeColor(type: string): string {
  if (type.includes('received') || type.includes('button_clicked') || type.includes('list_selected'))
    return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
  if (type.includes('delivered') || type.includes('sent'))
    return 'bg-green-500/10 text-green-400 border-green-500/20';
  if (type.includes('failed') || type.includes('bounced'))
    return 'bg-red-500/10 text-red-400 border-red-500/20';
  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
}

function statusColor(status: string): string {
  switch (status) {
    case 'success': return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'error': return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'ignored': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

function channelBadge(channel: string | null): string {
  switch (channel) {
    case 'whatsapp': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'sms': return 'bg-violet-500/10 text-violet-400 border-violet-500/20';
    case 'email': return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

function extractPreview(event: WebhookEvent): string {
  const p = event.payload as Record<string, unknown>;
  const incoming = p?.incoming as Record<string, unknown> | undefined;
  if (incoming?.body) return String(incoming.body).substring(0, 60);
  const msg = p?.message as Record<string, unknown> | undefined;
  if (msg?.status) return `Status: ${msg.status}`;
  return event.event_type;
}

function extractFromTo(event: WebhookEvent): { from: string; to: string } {
  const p = event.payload as Record<string, unknown>;
  const incoming = p?.incoming as Record<string, unknown> | undefined;
  const msg = p?.message as Record<string, unknown> | undefined;
  return {
    from: incoming?.from ? String(incoming.from) : '-',
    to: msg?.recipient ? String(msg.recipient) : '-',
  };
}

// ── Page ────────────────────────────────────────────────────

export default function WebhookEventsPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [eventType, setEventType] = useState('');
  const [channel, setChannel] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const pageSize = 30;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));
      if (eventType) params.set('event_type', eventType);
      if (channel) params.set('channel', channel);
      if (status) params.set('status', status);
      if (fromDate) params.set('from', new Date(fromDate).toISOString());
      if (toDate) params.set('to', new Date(toDate + 'T23:59:59').toISOString());

      const res = await fetch(`/api/v1/webhook-events?${params}`);
      const json = await res.json();
      if (json.success) {
        setEvents(json.data.events);
        setTotal(json.data.total);
      }
    } catch (err) {
      console.error('Failed to fetch webhook events:', err);
    } finally {
      setLoading(false);
    }
  }, [page, eventType, channel, status, fromDate, toDate]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = eventType || channel || status || fromDate || toDate;

  const clearFilters = () => {
    setEventType('');
    setChannel('');
    setStatus('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Webhook Events</h1>
            <p className="text-sm text-muted-foreground">
              {total} event{total !== 1 ? 's' : ''} logged
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEvents} disabled={loading}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Event Type</label>
          <select
            value={eventType}
            onChange={e => { setEventType(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All events</option>
            {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Channel</label>
          <select
            value={channel}
            onChange={e => { setChannel(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All channels</option>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Status</label>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">From</label>
          <Input
            type="date"
            value={fromDate}
            onChange={e => { setFromDate(e.target.value); setPage(1); }}
            className="h-9 w-36"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">To</label>
          <Input
            type="date"
            value={toDate}
            onChange={e => { setToDate(e.target.value); setPage(1); }}
            className="h-9 w-36"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Time</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Event</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Channel</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">From</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">To</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Preview</th>
              <th className="w-10 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && events.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : events.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No webhook events found
                </td>
              </tr>
            ) : (
              events.map(event => {
                const { from, to } = extractFromTo(event);
                const isExpanded = expandedId === event.id;
                return (
                  <EventRow
                    key={event.id}
                    event={event}
                    from={from}
                    to={to}
                    isExpanded={isExpanded}
                    onToggle={() => setExpandedId(isExpanded ? null : event.id)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Event Row (with expandable payload) ─────────────────────

function EventRow({
  event,
  from,
  to,
  isExpanded,
  onToggle,
}: {
  event: WebhookEvent;
  from: string;
  to: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className="cursor-pointer border-b border-border transition-colors hover:bg-muted/30"
        onClick={onToggle}
      >
        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
          {new Date(event.created_at).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${eventTypeColor(event.event_type)}`}>
            {event.event_type}
          </span>
        </td>
        <td className="px-4 py-3">
          {event.channel ? (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${channelBadge(event.channel)}`}>
              {event.channel}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColor(event.processing_result)}`}>
            {event.processing_result}
          </span>
        </td>
        <td className="max-w-[140px] truncate px-4 py-3 text-xs">{from}</td>
        <td className="max-w-[140px] truncate px-4 py-3 text-xs">{to}</td>
        <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">
          {extractPreview(event)}
        </td>
        <td className="px-4 py-3">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={8} className="border-b border-border bg-muted/20 px-4 py-4">
            <div className="space-y-2">
              <div className="flex gap-4 text-xs">
                <span className="text-muted-foreground">ID: <span className="font-mono text-foreground">{event.id}</span></span>
                <span className="text-muted-foreground">IP: <span className="font-mono text-foreground">{event.source_ip || '-'}</span></span>
                <span className="text-muted-foreground">Signature: <span className={event.signature_valid ? 'text-green-400' : 'text-red-400'}>{event.signature_valid ? 'valid' : 'invalid'}</span></span>
                {event.error && <span className="text-red-400">Error: {event.error}</span>}
              </div>
              <pre className="max-h-80 overflow-auto rounded-lg bg-background p-4 text-xs">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
