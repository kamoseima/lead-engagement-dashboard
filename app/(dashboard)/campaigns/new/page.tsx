'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  GitBranch,
  Edit3,
  Users,
  Phone,
  UserCheck,
  Clock,
  Zap,
  Calendar,
  Search,
  Loader2,
  Check,
  Repeat,
  Split,
  Minus,
  Plus,
} from 'lucide-react';
import { StepIndicator } from '@/components/shared/step-indicator';
import { ModeToggle, type ModeOption } from '@/components/shared/mode-toggle';
import { PhonePreview } from '@/components/shared/phone-preview';
import { ButtonEditor } from '@/components/shared/button-editor';
import { VariableEditor } from '@/components/shared/variable-editor';
import type { Template, TemplateButton } from '@/services/templates/template.service';
import type { Flow, ScheduleType, SendMode, Frequency } from '@/types/database';

const STEPS = ['Message', 'Recipients', 'Schedule'];

type MessageMode = 'template' | 'flow' | 'custom';
type RecipientMode = 'all' | 'manual' | 'select';

const MESSAGE_MODES: ModeOption[] = [
  { value: 'template', label: 'Template', hint: 'Pick an approved template', icon: FileText },
  { value: 'flow', label: 'Flow', hint: 'Multi-step flow', icon: GitBranch },
  { value: 'custom', label: 'Custom', hint: 'Write a message', icon: Edit3 },
];

const RECIPIENT_MODES: ModeOption[] = [
  { value: 'all', label: 'All Contacts', hint: 'Send to everyone', icon: Users },
  { value: 'manual', label: 'Enter Numbers', hint: 'Paste phone numbers', icon: Phone },
  { value: 'select', label: 'Select Specific', hint: 'Choose contacts', icon: UserCheck },
];

const SCHEDULE_MODES: ModeOption[] = [
  { value: 'immediate', label: 'Send Now', hint: 'Send immediately', icon: Zap },
  { value: 'once', label: 'One-time', hint: 'Specific date & time', icon: Clock },
  { value: 'recurring', label: 'Recurring', hint: 'Send on a schedule', icon: Repeat },
];

/** Generate evenly spaced default times for N sends per day (between 08:00-18:00) */
function generateDefaultTimes(count: number): string[] {
  if (count <= 1) return ['09:00'];
  const times: string[] = [];
  const startHour = 8;
  const endHour = 18;
  const gap = (endHour - startHour) / (count - 1);
  for (let i = 0; i < count; i++) {
    const h = Math.round(startHour + gap * i);
    times.push(`${String(h).padStart(2, '0')}:00`);
  }
  return times;
}

export default function NewCampaignPage() {
  const router = useRouter();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 0: Message
  const [campaignName, setCampaignName] = useState('');
  const [messageMode, setMessageMode] = useState<MessageMode>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
  const [customBody, setCustomBody] = useState('');
  const [customButtons, setCustomButtons] = useState<TemplateButton[]>([]);
  const [variableNames, setVariableNames] = useState<Record<string, string>>({});
  const [templateSearch, setTemplateSearch] = useState('');

  // Step 1: Recipients
  const [recipientMode, setRecipientMode] = useState<RecipientMode>('manual');
  const [manualNumbers, setManualNumbers] = useState('');

  // Step 2: Schedule
  const [scheduleType, setScheduleType] = useState<ScheduleType>('immediate');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [sendMode, setSendMode] = useState<SendMode>('all_at_once');
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [sendsPerDay, setSendsPerDay] = useState(1);
  const [sendTimes, setSendTimes] = useState<string[]>(['09:00']);
  const [endDate, setEndDate] = useState('');
  const [noEndDate, setNoEndDate] = useState(true);

  // Data
  const [templates, setTemplates] = useState<Template[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load templates + flows
  useEffect(() => {
    const load = async () => {
      setIsLoadingData(true);
      try {
        const [tplRes, flowRes] = await Promise.all([
          fetch('/api/v1/templates'),
          fetch('/api/v1/flows'),
        ]);
        const tplJson = await tplRes.json();
        const flowJson = await flowRes.json();
        if (tplJson.success) setTemplates(tplJson.data);
        if (flowJson.success) setFlows(flowJson.data);
      } catch {
        // handle silently
      } finally {
        setIsLoadingData(false);
      }
    };
    load();
  }, []);

  // Filtered templates
  const filteredTemplates = useMemo(
    () =>
      templates.filter((t) =>
        t.name.toLowerCase().includes(templateSearch.toLowerCase())
      ),
    [templates, templateSearch]
  );

  // Parse manual numbers
  const parsedNumbers = useMemo(() => {
    if (!manualNumbers.trim()) return [];
    return manualNumbers
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
  }, [manualNumbers]);

  // Recipient count
  const recipientCount =
    recipientMode === 'manual' ? parsedNumbers.length : 0;

  // Preview body/buttons based on mode
  const previewBody =
    messageMode === 'template'
      ? selectedTemplate?.body
      : messageMode === 'flow'
        ? flows.find((f) => f.id === selectedFlow?.id)?.steps[0]?.template
          ? templates.find(
              (t) =>
                t.name ===
                flows.find((f) => f.id === selectedFlow?.id)?.steps[0]
                  ?.template
            )?.body
          : undefined
        : customBody || undefined;

  const previewButtons =
    messageMode === 'template'
      ? selectedTemplate?.buttons
      : messageMode === 'custom' && customButtons.length > 0
        ? customButtons
        : undefined;

  const previewTitle =
    messageMode === 'template' ? selectedTemplate?.title : undefined;

  // Navigation
  const canNext = () => {
    if (currentStep === 0) {
      if (!campaignName) return false;
      if (messageMode === 'template' && !selectedTemplate) return false;
      if (messageMode === 'flow' && !selectedFlow) return false;
      if (messageMode === 'custom' && !customBody) return false;
      return true;
    }
    if (currentStep === 1) {
      if (recipientMode === 'manual' && parsedNumbers.length === 0)
        return false;
      return true;
    }
    if (currentStep === 2) {
      if (scheduleType === 'once' && (!scheduleDate || !scheduleTime))
        return false;
      if (scheduleType === 'recurring' && (!scheduleDate || sendTimes.length === 0))
        return false;
      return true;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const leads = parsedNumbers.map((phone) => ({
      name: phone,
      phone,
      variables: variableNames,
    }));

    const payload: Record<string, unknown> = {
      name: campaignName,
      leads,
    };

    if (messageMode === 'template' && selectedTemplate) {
      payload.template_name = selectedTemplate.name;
      payload.content_sid = selectedTemplate.content_sid;
    } else if (messageMode === 'flow' && selectedFlow) {
      payload.flow_id = selectedFlow.id;
    } else if (messageMode === 'custom') {
      payload.config = { custom_body: customBody, custom_buttons: customButtons };
    }

    payload.schedule_type = scheduleType;

    if (scheduleType === 'once' && scheduleDate && scheduleTime) {
      payload.schedule_at = new Date(
        `${scheduleDate}T${scheduleTime}`
      ).toISOString();
    }

    if (scheduleType === 'recurring') {
      payload.schedule_at = new Date(
        `${scheduleDate}T${sendTimes[0] || '09:00'}`
      ).toISOString();
      payload.send_mode = sendMode;
      payload.frequency = frequency;
      payload.frequency_interval = frequencyInterval;
      payload.sends_per_day = sendsPerDay;
      payload.send_times = sendTimes;
      if (!noEndDate && endDate) {
        payload.recurrence_end_at = new Date(`${endDate}T23:59:59`).toISOString();
      }
    }

    try {
      const res = await fetch('/api/v1/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        router.push('/campaigns');
      }
    } catch {
      // handle error silently
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/campaigns')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">New Campaign</h1>
          <p className="text-xs text-muted-foreground">
            Set up a new outreach campaign
          </p>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator steps={STEPS} currentStep={currentStep} />

      {/* 2-Column Layout */}
      <div className="grid gap-7 lg:grid-cols-[1fr_340px]">
        {/* ─── Left: Wizard Steps ─── */}
        <div className="space-y-6">
          {/* ════════════ STEP 0: MESSAGE ════════════ */}
          {currentStep === 0 && (
            <>
              {/* Campaign Name */}
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Campaign Name
                </h2>
                <Input
                  placeholder="e.g. March Promo Blast"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  required
                />
              </section>

              {/* Message Mode */}
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Message Type
                </h2>
                <ModeToggle
                  options={MESSAGE_MODES}
                  value={messageMode}
                  onChange={(v) => setMessageMode(v as MessageMode)}
                />
              </section>

              {/* Template Picker */}
              {messageMode === 'template' && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Select Template
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      className="pl-9 text-xs"
                    />
                  </div>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto">
                      {filteredTemplates.map((tpl) => {
                        const isSelected =
                          selectedTemplate?.name === tpl.name;
                        return (
                          <button
                            key={tpl.name}
                            type="button"
                            onClick={() => setSelectedTemplate(tpl)}
                            className={`relative w-full rounded-lg border p-3 text-left transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-medium">
                                {tpl.name}
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-[9px]"
                              >
                                {tpl.type}
                              </Badge>
                            </div>
                            {tpl.body && (
                              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                                {tpl.body}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Flow Picker */}
              {messageMode === 'flow' && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Select Flow
                  </h2>
                  {isLoadingData ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : flows.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No flows available. Create one first.
                    </p>
                  ) : (
                    <div className="max-h-[320px] space-y-2 overflow-y-auto">
                      {flows.map((flow) => {
                        const isSelected = selectedFlow?.id === flow.id;
                        return (
                          <button
                            key={flow.id}
                            type="button"
                            onClick={() => setSelectedFlow(flow)}
                            className={`relative w-full rounded-lg border p-3 text-left transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/30'
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                                <Check className="h-2.5 w-2.5 text-primary-foreground" />
                              </div>
                            )}
                            <span className="text-xs font-medium">
                              {flow.name}
                            </span>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                              {flow.steps.length} step
                              {flow.steps.length !== 1 ? 's' : ''}
                              {flow.description ? ` — ${flow.description}` : ''}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* Custom Message */}
              {messageMode === 'custom' && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Custom Message
                  </h2>
                  <div className="space-y-2">
                    <Label className="text-xs">Body</Label>
                    <Textarea
                      placeholder={`Hi {{1}}, check out our latest offer!`}
                      value={customBody}
                      onChange={(e) => setCustomBody(e.target.value)}
                      rows={4}
                      maxLength={1024}
                    />
                    <p className="text-right text-[10px] text-muted-foreground">
                      {customBody.length}/1024
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Buttons (optional)</Label>
                    <ButtonEditor
                      buttons={customButtons}
                      onChange={setCustomButtons}
                    />
                  </div>
                </section>
              )}

              {/* Variable Inputs */}
              {messageMode === 'template' && selectedTemplate?.body && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <VariableEditor
                    bodyText={selectedTemplate.body}
                    titleText={selectedTemplate.title}
                    variableNames={variableNames}
                    onChange={setVariableNames}
                    friendlyNames={selectedTemplate.variables}
                  />
                </section>
              )}
              {messageMode === 'custom' && customBody && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <VariableEditor
                    bodyText={customBody}
                    variableNames={variableNames}
                    onChange={setVariableNames}
                  />
                </section>
              )}
            </>
          )}

          {/* ════════════ STEP 1: RECIPIENTS ════════════ */}
          {currentStep === 1 && (
            <>
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  Recipient Selection
                </h2>
                <ModeToggle
                  options={RECIPIENT_MODES}
                  value={recipientMode}
                  onChange={(v) => setRecipientMode(v as RecipientMode)}
                />
              </section>

              {recipientMode === 'manual' && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                    Phone Numbers
                  </h2>
                  <Textarea
                    placeholder={`+27821234567\n+27829876543\n+27831112222`}
                    value={manualNumbers}
                    onChange={(e) => setManualNumbers(e.target.value)}
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one number per line, or separate with commas.
                    <span className="ml-2 font-medium text-foreground">
                      {parsedNumbers.length} number
                      {parsedNumbers.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                </section>
              )}

              {recipientMode === 'all' && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground">
                    This will send to all contacts in your organisation. The
                    exact count will be determined at send time.
                  </p>
                </section>
              )}

              {recipientMode === 'select' && (
                <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                  <p className="text-xs text-muted-foreground">
                    Contact selection is coming soon. For now, use &quot;Enter
                    Numbers&quot; to paste specific phone numbers.
                  </p>
                </section>
              )}
            </>
          )}

          {/* ════════════ STEP 2: SCHEDULE & REVIEW ════════════ */}
          {currentStep === 2 && (
            <>
              {/* Schedule Type */}
              <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  When to Send
                </h2>
                <ModeToggle
                  options={SCHEDULE_MODES}
                  value={scheduleType}
                  onChange={(v) => setScheduleType(v as ScheduleType)}
                />

                {/* One-time: date + time */}
                {scheduleType === 'once' && (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Date</Label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Time</Label>
                      <Input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </section>

              {/* Recurring configuration */}
              {scheduleType === 'recurring' && (
                <>
                  {/* Start date + frequency */}
                  <section className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                      Recurrence Settings
                    </h2>

                    {/* Start date */}
                    <div className="space-y-1">
                      <Label className="text-xs">Start date</Label>
                      <Input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="w-48 text-xs"
                      />
                    </div>

                    {/* Frequency row: Every [N] [days/weeks/months] */}
                    <div className="space-y-1">
                      <Label className="text-xs">Frequency</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Every</span>
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            type="button"
                            onClick={() => setFrequencyInterval(Math.max(1, frequencyInterval - 1))}
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[28px] text-center text-sm font-medium">
                            {frequencyInterval}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFrequencyInterval(frequencyInterval + 1)}
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex rounded-md border border-border">
                          {(['daily', 'weekly', 'monthly'] as Frequency[]).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => setFrequency(f)}
                              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                frequency === f
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:text-foreground'
                              } ${f !== 'daily' ? 'border-l border-border' : ''}`}
                            >
                              {f === 'daily'
                                ? frequencyInterval === 1 ? 'day' : 'days'
                                : f === 'weekly'
                                  ? frequencyInterval === 1 ? 'week' : 'weeks'
                                  : frequencyInterval === 1 ? 'month' : 'months'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Sends per day */}
                    <div className="space-y-1">
                      <Label className="text-xs">Sends per day</Label>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center rounded-md border border-border">
                          <button
                            type="button"
                            onClick={() => {
                              const n = Math.max(1, sendsPerDay - 1);
                              setSendsPerDay(n);
                              setSendTimes(generateDefaultTimes(n));
                            }}
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="min-w-[28px] text-center text-sm font-medium">
                            {sendsPerDay}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const n = Math.min(5, sendsPerDay + 1);
                              setSendsPerDay(n);
                              setSendTimes(generateDefaultTimes(n));
                            }}
                            className="px-2 py-1.5 text-muted-foreground hover:text-foreground"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          time{sendsPerDay !== 1 ? 's' : ''} per day
                        </span>
                      </div>
                    </div>

                    {/* Send times */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Send times</Label>
                      <div className="flex flex-wrap gap-2">
                        {sendTimes.map((time, idx) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {idx + 1}
                            </span>
                            <Input
                              type="time"
                              value={time}
                              onChange={(e) => {
                                const updated = [...sendTimes];
                                updated[idx] = e.target.value;
                                setSendTimes(updated);
                              }}
                              className="h-8 w-28 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  {/* Send mode */}
                  <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                      Send Mode
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSendMode('all_at_once')}
                        className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                          sendMode === 'all_at_once'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        {sendMode === 'all_at_once' && (
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                        <Users className={`h-4 w-4 ${sendMode === 'all_at_once' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${sendMode === 'all_at_once' ? 'text-primary' : ''}`}>
                          Re-send All
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          Same recipients every send
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendMode('batched')}
                        className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
                          sendMode === 'batched'
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/30'
                        }`}
                      >
                        {sendMode === 'batched' && (
                          <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                            <Check className="h-2.5 w-2.5 text-primary-foreground" />
                          </div>
                        )}
                        <Split className={`h-4 w-4 ${sendMode === 'batched' ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${sendMode === 'batched' ? 'text-primary' : ''}`}>
                          Batch Split
                        </span>
                        <span className="text-[10px] leading-tight text-muted-foreground">
                          Split recipients across windows
                        </span>
                      </button>
                    </div>
                  </section>

                  {/* End date */}
                  <section className="space-y-3 rounded-xl border border-border bg-card p-5">
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                      End Date
                    </h2>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={noEndDate}
                        onChange={(e) => setNoEndDate(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                      <span className="text-xs text-muted-foreground">No end date (runs indefinitely)</span>
                    </label>
                    {!noEndDate && (
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-48 text-xs"
                      />
                    )}
                  </section>
                </>
              )}

              {/* Summary */}
              <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-5">
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                  Campaign Summary
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{campaignName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Message</span>
                    <span className="font-medium">
                      {messageMode === 'template'
                        ? selectedTemplate?.name || '—'
                        : messageMode === 'flow'
                          ? selectedFlow?.name || '—'
                          : 'Custom message'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Recipients</span>
                    <span className="font-medium">
                      {recipientMode === 'all'
                        ? 'All contacts'
                        : recipientMode === 'manual'
                          ? `${parsedNumbers.length} numbers`
                          : 'Selected contacts'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Schedule</span>
                    <span className="text-right text-xs font-medium">
                      {scheduleType === 'immediate'
                        ? 'Send immediately'
                        : scheduleType === 'once'
                          ? scheduleDate && scheduleTime
                            ? `${scheduleDate} at ${scheduleTime}`
                            : 'Not set'
                          : (() => {
                              const freqLabel =
                                frequencyInterval === 1
                                  ? frequency
                                  : `every ${frequencyInterval} ${frequency === 'daily' ? 'days' : frequency === 'weekly' ? 'weeks' : 'months'}`;
                              const timesLabel = sendTimes.length > 0 ? sendTimes.join(', ') : '—';
                              const modeLabel = sendMode === 'all_at_once' ? 're-send all' : 'batched';
                              const endLabel =
                                noEndDate
                                  ? 'no end'
                                  : endDate
                                    ? `until ${endDate}`
                                    : 'no end';
                              return `${freqLabel}, ${sendsPerDay}x (${timesLabel}), ${modeLabel}, from ${scheduleDate || '—'}, ${endLabel}`;
                            })()}
                    </span>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pb-8">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                currentStep > 0
                  ? setCurrentStep(currentStep - 1)
                  : router.push('/campaigns')
              }
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {currentStep > 0 ? 'Back' : 'Cancel'}
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canNext()}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canNext()}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {scheduleType === 'immediate'
                  ? 'Launch Campaign'
                  : 'Schedule Campaign'}
              </Button>
            )}
          </div>
        </div>

        {/* ─── Right: Phone Preview ─── */}
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <PhonePreview
              body={previewBody}
              title={previewTitle}
              mediaUrl={
                messageMode === 'template'
                  ? selectedTemplate?.media_url
                  : undefined
              }
              buttons={previewButtons}
              variableNames={variableNames}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
