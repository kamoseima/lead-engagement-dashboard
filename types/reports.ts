/**
 * Report Types
 */

export interface DateRange {
  from: string;
  to: string;
}

export interface OverviewMetrics {
  totalLeads: number;
  activeLeads: number;
  messagesSent: number;
  replyRate: number;
  deliveryRate: number;
}

export interface CampaignPerformanceRow {
  campaignId: string;
  campaignName: string;
  totalSends: number;
  delivered: number;
  replied: number;
  failed: number;
  replyRate: number;
}

export interface SegmentDistribution {
  hot: number;
  warm: number;
  cold: number;
  unresponsive: number;
}

export interface DailyActivity {
  date: string;
  sent: number;
  replied: number;
}

export interface ReportData {
  overview: OverviewMetrics;
  campaignPerformance: CampaignPerformanceRow[];
  timeline: DailyActivity[];
  segments?: SegmentDistribution;
}
