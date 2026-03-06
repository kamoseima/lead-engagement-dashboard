'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Users,
  UserCheck,
  MessageSquare,
  Reply,
  CheckCircle2,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { ReportData, CampaignPerformanceRow, DailyActivity, SegmentDistribution } from '@/types/reports';

const PERIODS = [
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
];

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/reports?period=${period}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = (type: string) => {
    window.location.href = `/api/v1/export?type=${type}&period=${period}`;
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Reports</h1>
            <p className="text-sm text-muted-foreground">Campaign performance and lead engagement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                  period === p.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-20 text-center text-muted-foreground">Loading report data...</div>
      ) : data ? (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <MetricCard icon={Users} label="Total Leads" value={data.overview.totalLeads} />
            <MetricCard icon={UserCheck} label="Active Leads" value={data.overview.activeLeads} />
            <MetricCard icon={MessageSquare} label="Messages Sent" value={data.overview.messagesSent} />
            <MetricCard icon={Reply} label="Reply Rate" value={data.overview.replyRate} suffix="%" />
            <MetricCard icon={CheckCircle2} label="Delivery Rate" value={data.overview.deliveryRate} suffix="%" />
          </div>

          {/* Campaign Performance */}
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <h2 className="text-sm font-bold">Campaign Performance</h2>
              <Button variant="ghost" size="sm" onClick={() => handleExport('sends')}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
            </div>
            <CampaignTable rows={data.campaignPerformance} />
          </div>

          {/* Two-column: Segments + Timeline */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Segment Distribution */}
            {data.segments && (
              <div className="rounded-xl border border-border p-5">
                <h2 className="mb-4 text-sm font-bold">Lead Segments</h2>
                <SegmentBars segments={data.segments} />
              </div>
            )}

            {/* Activity Timeline */}
            <div className="rounded-xl border border-border p-5">
              <h2 className="mb-4 text-sm font-bold">Activity Timeline</h2>
              {data.timeline.length > 0 ? (
                <ActivityChart data={data.timeline} />
              ) : (
                <p className="py-8 text-center text-xs text-muted-foreground">No activity data</p>
              )}
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('leads')}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Leads
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('events')}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export Webhook Events
            </Button>
          </div>
        </>
      ) : (
        <div className="py-20 text-center text-muted-foreground">Failed to load report data</div>
      )}
    </div>
  );
}

// ── Metric Card ─────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, suffix }: {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">
        {value.toLocaleString()}{suffix}
      </p>
    </div>
  );
}

// ── Campaign Table ──────────────────────────────────────────

function CampaignTable({ rows }: { rows: CampaignPerformanceRow[] }) {
  if (rows.length === 0) {
    return <p className="px-5 py-8 text-center text-xs text-muted-foreground">No campaign data</p>;
  }
  const maxSends = Math.max(...rows.map(r => r.totalSends), 1);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border bg-muted/30 text-left">
          <th className="px-5 py-2.5 font-medium text-muted-foreground">Campaign</th>
          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Sends</th>
          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Delivered</th>
          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Replied</th>
          <th className="px-3 py-2.5 text-right font-medium text-muted-foreground">Failed</th>
          <th className="w-40 px-3 py-2.5 font-medium text-muted-foreground">Reply Rate</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.campaignId} className="border-b border-border">
            <td className="px-5 py-2.5 font-medium">{row.campaignName}</td>
            <td className="px-3 py-2.5 text-right tabular-nums">{row.totalSends}</td>
            <td className="px-3 py-2.5 text-right tabular-nums text-green-400">{row.delivered}</td>
            <td className="px-3 py-2.5 text-right tabular-nums text-blue-400">{row.replied}</td>
            <td className="px-3 py-2.5 text-right tabular-nums text-red-400">{row.failed}</td>
            <td className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${row.replyRate}%` }}
                  />
                </div>
                <span className="w-8 text-right text-xs tabular-nums">{row.replyRate}%</span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Segment Bars ────────────────────────────────────────────

const SEGMENT_CONFIG = {
  hot: { label: 'Hot', color: 'bg-red-500' },
  warm: { label: 'Warm', color: 'bg-orange-500' },
  cold: { label: 'Cold', color: 'bg-blue-500' },
  unresponsive: { label: 'Unresponsive', color: 'bg-gray-500' },
};

function SegmentBars({ segments }: { segments: SegmentDistribution }) {
  const total = segments.hot + segments.warm + segments.cold + segments.unresponsive;
  if (total === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">No lead segment data</p>;
  }

  return (
    <div className="space-y-3">
      {(Object.keys(SEGMENT_CONFIG) as (keyof typeof SEGMENT_CONFIG)[]).map(key => {
        const config = SEGMENT_CONFIG[key];
        const count = segments[key];
        const pct = Math.round((count / total) * 100);
        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{config.label}</span>
              <span className="text-muted-foreground">{count} ({pct}%)</span>
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div className={`h-2 rounded-full ${config.color}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Activity Chart (SVG) ────────────────────────────────────

function ActivityChart({ data }: { data: DailyActivity[] }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.sent, d.replied)), 1);
  const barWidth = Math.max(4, Math.min(20, 600 / data.length - 2));
  const chartWidth = data.length * (barWidth * 2 + 6);
  const chartHeight = 120;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 20}`} className="w-full" style={{ minWidth: Math.min(chartWidth, 400) }}>
        {data.map((d, i) => {
          const x = i * (barWidth * 2 + 6);
          const sentH = (d.sent / maxVal) * chartHeight;
          const repliedH = (d.replied / maxVal) * chartHeight;
          return (
            <g key={d.date}>
              {/* Sent bar */}
              <rect
                x={x}
                y={chartHeight - sentH}
                width={barWidth}
                height={sentH}
                rx={2}
                className="fill-primary/40"
              />
              {/* Replied bar */}
              <rect
                x={x + barWidth + 1}
                y={chartHeight - repliedH}
                width={barWidth}
                height={repliedH}
                rx={2}
                className="fill-green-500"
              />
              {/* Date label (every 5th) */}
              {i % 5 === 0 && (
                <text
                  x={x + barWidth}
                  y={chartHeight + 14}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px]"
                >
                  {d.date.substring(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-primary/40" /> Sent
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-sm bg-green-500" /> Replied
        </span>
      </div>
    </div>
  );
}
