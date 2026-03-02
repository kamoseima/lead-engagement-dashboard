'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PhonePreview } from '@/components/shared/phone-preview';
import { FlowPhonePreview } from '@/components/shared/flow-phone-preview';
import { VariableEditor } from '@/components/shared/variable-editor';
import { CreateScenarioModal } from '@/components/testing/create-scenario-modal';
import { extractVariables } from '@/lib/whatsapp-format';
import {
  FlaskConical,
  Plus,
  Play,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  FileText,
  GitBranch,
  Eye,
  Send,
} from 'lucide-react';
import type { TestScenario, TestRun, TestRunMessage, Flow } from '@/types/database';
import type { Template } from '@/services/templates/template.service';

// ── Status helpers ──────────────────────────────────────────

const statusConfig: Record<string, { icon: React.ReactNode; label: string; className: string }> = {
  running: {
    icon: <Clock className="h-3 w-3 animate-pulse" />,
    label: 'Running',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  },
  waiting_reply: {
    icon: <MessageSquare className="h-3 w-3" />,
    label: 'Waiting',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  completed: {
    icon: <CheckCircle className="h-3 w-3" />,
    label: 'Done',
    className: 'bg-green-500/10 text-green-400 border-green-500/20',
  },
  failed: {
    icon: <XCircle className="h-3 w-3" />,
    label: 'Failed',
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  timeout: {
    icon: <Clock className="h-3 w-3" />,
    label: 'Timeout',
    className: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.running;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// ── Page ────────────────────────────────────────────────────

export default function TestingPage() {
  // Data
  const [scenarios, setScenarios] = useState<TestScenario[]>([]);
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  // UI state
  const [selectedScenario, setSelectedScenario] = useState<TestScenario | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);

  // Real Send form
  const [leadName, setLeadName] = useState('Test User');
  const [leadPhone, setLeadPhone] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Simulate preview state
  const [simVariableNames, setSimVariableNames] = useState<Record<string, string>>({});

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Data loading ─────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      const [testsRes, tplRes, flowsRes] = await Promise.all([
        fetch('/api/v1/tests'),
        fetch('/api/v1/templates'),
        fetch('/api/v1/flows'),
      ]);

      const [testsJson, tplJson, flowsJson] = await Promise.all([
        testsRes.json(),
        tplRes.json(),
        flowsRes.json(),
      ]);

      if (testsJson.success) {
        setScenarios(testsJson.data.scenarios || []);
        setTestRuns(testsJson.data.runs || []);
      }
      if (tplJson.success) setTemplates(tplJson.data || []);
      if (flowsJson.success) setFlows(flowsJson.data || []);
    } catch {
      // silently handle
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRuns = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/tests');
      const json = await res.json();
      if (json.success) {
        setTestRuns(json.data.runs || []);
        setScenarios(json.data.scenarios || []);
      }
    } catch { /* */ }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Polling for active runs ──────────────────────────────

  useEffect(() => {
    const hasActiveRuns = testRuns.some(r => r.status === 'running' || r.status === 'waiting_reply');

    if (hasActiveRuns && !pollRef.current) {
      pollRef.current = setInterval(refreshRuns, 5000);
    } else if (!hasActiveRuns && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [testRuns, refreshRuns]);

  // ── Handlers ─────────────────────────────────────────────

  const handleSendTest = async () => {
    if (!selectedScenario || !leadPhone) return;
    setIsSending(true);

    // For flow scenarios, resolve the first step's template name
    let templateName = selectedScenario.template_name || '';
    if (!templateName && selectedScenario.flow_id && selectedFlow) {
      templateName = selectedFlow.steps[0]?.template || '';
    }

    try {
      const res = await fetch('/api/v1/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioId: selectedScenario.id,
          leadName,
          leadPhone,
          templateName,
          variables,
        }),
      });

      const json = await res.json();
      if (json.success) {
        refreshRuns();
      }
    } catch {
      // handle error
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/tests/scenarios/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        if (selectedScenario?.id === id) setSelectedScenario(null);
        refreshRuns();
      }
    } catch { /* */ }
  };

  // ── Derived data ─────────────────────────────────────────

  const selectedTemplate = selectedScenario?.template_name
    ? templates.find(t => t.name === selectedScenario.template_name)
    : null;

  const selectedFlow = selectedScenario?.flow_id
    ? flows.find(f => f.id === selectedScenario.flow_id)
    : null;

  const scenarioType: 'template' | 'flow' | null = selectedScenario
    ? selectedScenario.template_name ? 'template' : selectedScenario.flow_id ? 'flow' : null
    : null;

  // Extract variables from selected template body
  const templateVars = selectedTemplate?.body ? extractVariables(selectedTemplate.body) : [];

  // ── Loading state ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Loading testing dashboard...</p>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Testing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Test WhatsApp message flows and template delivery.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr_280px]">
        {/* ── Left: Scenario List ─────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Scenarios
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="mr-1 h-3 w-3" />
              New
            </Button>
          </div>

          {scenarios.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <FlaskConical className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">No scenarios yet.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="mr-1 h-3 w-3" />
                Create one
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {scenarios.map(scenario => (
                <div
                  key={scenario.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedScenario(scenario)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedScenario(scenario); }}
                  className={`group relative w-full cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                    selectedScenario?.id === scenario.id
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-border bg-card hover:border-primary/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {scenario.template_name ? (
                          <FileText className="h-3 w-3 shrink-0 text-muted-foreground" />
                        ) : (
                          <GitBranch className="h-3 w-3 shrink-0 text-muted-foreground" />
                        )}
                        <h3 className="truncate text-sm font-medium">{scenario.name}</h3>
                      </div>
                      {scenario.description && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 pl-5">
                          {scenario.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-2 pl-5">
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {scenario.template_name ? 'Template' : 'Flow'}
                        </span>
                        {scenario.template_name && (
                          <span className="truncate font-mono text-[9px] text-muted-foreground">
                            {scenario.template_name}
                          </span>
                        )}
                        {scenario.is_builtin && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary">
                            Built-in
                          </span>
                        )}
                      </div>
                    </div>
                    {!scenario.is_builtin && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteScenario(scenario.id);
                        }}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Center: Test Config ─────────────────────────── */}
        <div>
          {selectedScenario ? (
            <Tabs defaultValue="send" className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">{selectedScenario.name}</h2>
                    {selectedScenario.description && (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {selectedScenario.description}
                      </p>
                    )}
                  </div>
                  <TabsList>
                    <TabsTrigger value="send" className="gap-1.5">
                      <Send className="h-3 w-3" />
                      Real Send
                    </TabsTrigger>
                    <TabsTrigger value="simulate" className="gap-1.5">
                      <Eye className="h-3 w-3" />
                      Simulate
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>

              {/* Real Send Tab */}
              <TabsContent value="send">
                <div className="rounded-xl border border-border bg-card p-4 space-y-4">
                  <h3 className="text-sm font-semibold">Lead Details</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={leadName}
                        onChange={e => setLeadName(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Phone (E.164)</Label>
                      <Input
                        placeholder="+27821234567"
                        value={leadPhone}
                        onChange={e => setLeadPhone(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>

                  {/* Template variables */}
                  {scenarioType === 'template' && templateVars.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-xs">Template Variables</Label>
                      {templateVars.map(num => (
                        <div key={num} className="flex items-center gap-2">
                          <span className="flex h-8 shrink-0 items-center rounded bg-primary/10 px-2 font-mono text-[11px] font-semibold text-primary">
                            {`{{${num}}}`}
                          </span>
                          <Input
                            placeholder={`Value for variable ${num}`}
                            value={variables[String(num)] || ''}
                            onChange={e =>
                              setVariables(prev => ({ ...prev, [String(num)]: e.target.value }))
                            }
                            className="h-8 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {scenarioType === 'flow' && (
                    <div className="rounded-lg border border-dashed border-border p-3 text-center">
                      <p className="text-xs text-muted-foreground">
                        Flow tests send the first step&apos;s template. The flow engine handles subsequent steps automatically.
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    onClick={handleSendTest}
                    disabled={isSending || !leadPhone}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    {isSending ? 'Sending...' : 'Send Test'}
                  </Button>
                </div>
              </TabsContent>

              {/* Simulate Tab */}
              <TabsContent value="simulate">
                <div className="flex flex-col items-center gap-4">
                  {scenarioType === 'template' && selectedTemplate && (
                    <>
                      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-3">
                        <VariableEditor
                          bodyText={selectedTemplate.body || ''}
                          titleText={selectedTemplate.title}
                          variableNames={simVariableNames}
                          onChange={setSimVariableNames}
                        />
                      </div>
                      <PhonePreview
                        body={selectedTemplate.body}
                        title={selectedTemplate.title}
                        mediaUrl={selectedTemplate.media_url}
                        buttons={selectedTemplate.buttons}
                        variableNames={simVariableNames}
                      />
                    </>
                  )}

                  {scenarioType === 'flow' && selectedFlow && (
                    <FlowPhonePreview
                      steps={selectedFlow.steps}
                      templates={templates}
                    />
                  )}

                  {!scenarioType && (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 w-full">
                      <Eye className="mb-3 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        This scenario has no template or flow configured.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16">
              <FlaskConical className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                Select a scenario to get started
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Choose from the list or create a new one.
              </p>
            </div>
          )}
        </div>

        {/* ── Right: Activity Feed ────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Recent Runs
          </h2>
          {testRuns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <p className="text-xs text-muted-foreground">No test runs yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {testRuns.map(run => {
                const isExpanded = expandedRunId === run.id;

                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setExpandedRunId(isExpanded ? null : run.id)}
                    className="w-full rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-primary/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <StatusBadge status={run.status} />
                        <span className="truncate text-sm font-medium">
                          {run.lead_name || run.lead_phone}
                        </span>
                      </div>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {new Date(run.started_at).toLocaleTimeString('en-ZA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {run.template_name && (
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {run.template_name}
                      </p>
                    )}

                    {/* Expanded message timeline */}
                    {isExpanded && run.messages.length > 0 && (
                      <div className="mt-2 space-y-1.5 border-t border-border pt-2">
                        {(run.messages as TestRunMessage[]).map((msg, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            {msg.direction === 'outbound' ? (
                              <ArrowUpRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            ) : (
                              <ArrowDownLeft className="mt-0.5 h-3 w-3 shrink-0 text-purple-400" />
                            )}
                            <div className="min-w-0">
                              <span className="text-muted-foreground">{msg.body}</span>
                              {msg.status && (
                                <span className="ml-1.5 text-[9px] text-muted-foreground/60">
                                  ({msg.status})
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {run.error && (
                      <p className="mt-1 text-[11px] text-destructive">{run.error}</p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Scenario Modal */}
      <CreateScenarioModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        templates={templates}
        flows={flows}
        onCreated={refreshRuns}
      />
    </div>
  );
}
