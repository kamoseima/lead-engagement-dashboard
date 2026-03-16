/**
 * Database Types
 *
 * TypeScript types matching the Supabase database schema.
 */

export type UserRole = 'admin' | 'agent';

export interface DashboardUser {
  id: string;
  email: string;
  display_name: string | null;
  role: UserRole;
  org_id: string;
  invited_by: string | null;
  created_at: string;
  updated_at: string;
}

export type BranchType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER' | 'LIST_ITEM' | 'CUSTOM';

export interface FlowStep {
  template?: string;
  templateType?: string;
  label?: string;
  delayMinutes?: number;
  branches?: FlowBranch[];
}

export interface FlowBranch {
  buttonLabel: string;
  buttonType?: BranchType;
  steps: FlowStep[];
}

export interface FlowFallback {
  template: string;
  delayMinutes: number;
}

export interface Flow {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  steps: FlowStep[];
  fallback: FlowFallback | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'paused' | 'failed';

export interface CampaignLead {
  name: string;
  surname?: string;
  phone: string;
  email?: string;
  company?: string;
  variables?: Record<string, string>;
}

export type CampaignChannel = 'whatsapp' | 'email';
export type ScheduleType = 'immediate' | 'once' | 'recurring';
export type SendMode = 'all_at_once' | 'batched';
export type Frequency = 'daily' | 'weekly' | 'monthly';

export interface Campaign {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  channel: CampaignChannel;
  flow_id: string | null;
  template_name: string | null;
  status: CampaignStatus;
  leads: CampaignLead[];
  schedule_at: string | null;
  schedule_type: ScheduleType;
  send_mode: SendMode;
  frequency: Frequency | null;
  frequency_interval: number;
  sends_per_day: number;
  send_times: string[];
  recurrence_end_at: string | null;
  config: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type SendStatus = 'pending' | 'queued' | 'sent' | 'delivered' | 'failed' | 'replied';

export interface CampaignSend {
  id: string;
  campaign_id: string;
  org_id: string;
  lead_name: string | null;
  lead_phone: string;
  template_name: string | null;
  variables: Record<string, string> | null;
  status: SendStatus;
  provider_message_id: string | null;
  idempotency_key: string | null;
  error: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface TestScenario {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  flow_id: string | null;
  template_name: string | null;
  is_builtin: boolean;
  config: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TestRunStatus = 'running' | 'waiting_reply' | 'completed' | 'failed' | 'timeout';

export interface TestRun {
  id: string;
  scenario_id: string | null;
  org_id: string;
  lead_name: string | null;
  lead_phone: string;
  status: TestRunStatus;
  messages: TestRunMessage[];
  template_name: string | null;
  variables: Record<string, string> | null;
  flow_state: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
  created_by: string | null;
}

export interface TestRunMessage {
  direction: 'outbound' | 'inbound';
  body: string;
  template?: string;
  timestamp: string;
  status?: string;
}

// Lead Scoring & Pipeline

export type LeadSegment = 'hot' | 'warm' | 'cold' | 'unresponsive';
export type LeadPipelineStage = 'new' | 'contacted' | 'engaged' | 'qualified' | 'converted' | 'lost';
export type ActivityType = 'sent' | 'delivered' | 'replied' | 'failed' | 'bounced' | 'clicked';
export type ActivitySource = 'campaign' | 'test' | 'manual';

export interface Lead {
  id: string;
  org_id: string;
  name: string | null;
  phone: string;
  email: string | null;
  score: number;
  segment: LeadSegment;
  pipeline_stage: LeadPipelineStage;
  tags: string[];
  first_seen_at: string;
  last_activity_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  org_id: string;
  activity_type: ActivityType;
  source: ActivitySource;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Webhook Event Log

export type WebhookProcessingResult = 'success' | 'error' | 'ignored' | 'pending';

export interface WebhookEvent {
  id: string;
  org_id: string | null;
  event_type: string;
  channel: string | null;
  payload: Record<string, unknown>;
  source_ip: string | null;
  signature_valid: boolean;
  processing_result: WebhookProcessingResult;
  error: string | null;
  created_at: string;
}
