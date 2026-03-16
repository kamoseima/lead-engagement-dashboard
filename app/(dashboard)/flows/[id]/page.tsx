'use client';

import { useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Save,
  Plus,
  GitBranch,
  Loader2,
  AlertTriangle,
  Smartphone,
  X,
  Pin,
  PinOff,
  Bot,
} from 'lucide-react';
import { FlowStepNode } from '@/components/shared/flow-step-node';
import { FlowPhonePreview } from '@/components/shared/flow-phone-preview';
import { AiChatPanel } from '@/components/flows/ai-chat-panel';
import { useFlowEditorStore, pathEquals } from '@/lib/stores/flow-editor-store';
import type { FlowStep } from '@/types/database';

export default function FlowEditorPage() {
  const params = useParams();
  const router = useRouter();
  const flowId = params.id as string;

  const {
    flow,
    templates,
    isLoading,
    isSaving,
    hasChanges,
    previewMode,
    selectedPath,
    selectedStep,
    aiPanelOpen,
    setFlow,
    setTemplates,
    setLoading,
    setSaving,
    updateFlow,
    addRootStep,
    removeStep,
    updateStep,
    updateFallback,
    selectStep,
    setPreviewMode,
    setAiPanelOpen,
  } = useFlowEditorStore();

  // Load flow + templates in parallel
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [flowRes, tplRes] = await Promise.all([
          fetch(`/api/v1/flows/${flowId}`),
          fetch('/api/v1/templates'),
        ]);
        const flowJson = await flowRes.json();
        const tplJson = await tplRes.json();
        if (flowJson.success) setFlow(flowJson.data);
        if (tplJson.success) setTemplates(tplJson.data);
      } catch {
        // handle error silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [flowId, setFlow, setTemplates, setLoading]);

  const handleSave = useCallback(async () => {
    if (!flow) return;
    setSaving(true);
    try {
      await fetch(`/api/v1/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: flow.name,
          description: flow.description,
          steps: flow.steps,
          fallback: flow.fallback,
        }),
      });
      useFlowEditorStore.setState({ hasChanges: false });
    } catch {
      // handle error silently
    } finally {
      setSaving(false);
    }
  }, [flow, flowId, setSaving]);

  // Handlers for FlowStepNode (adapt path-based store to index-based component)
  const handleUpdateStep = useCallback(
    (index: number, updates: Partial<FlowStep>) => {
      updateStep([index], updates);
    },
    [updateStep]
  );

  const handleRemoveStep = useCallback(
    (index: number) => {
      removeStep([index]);
    },
    [removeStep]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading flow...</p>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Flow not found.</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => router.push('/flows')}
        >
          Back to Flows
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/flows')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={flow.name}
              onChange={(e) => updateFlow({ name: e.target.value })}
              className="border-none bg-transparent text-xl font-bold tracking-tight focus-visible:ring-0"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* AI Chat toggle */}
          <Button
            variant={aiPanelOpen ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
          >
            <Bot className="mr-1.5 h-3.5 w-3.5" />
            AI Builder
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Layout: main + optional side panels */}
      <div
        className={`grid gap-6 ${
          previewMode === 'pinned' && aiPanelOpen
            ? 'lg:grid-cols-[1fr_360px_340px]'
            : previewMode === 'pinned'
              ? 'lg:grid-cols-[1fr_360px]'
              : aiPanelOpen
                ? 'lg:grid-cols-[1fr_340px]'
                : ''
        }`}
      >
        {/* ─── Flow Builder ─── */}
        <div className="space-y-6">
          {/* Description */}
          <section className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
              Description
            </h2>
            <Textarea
              placeholder="Describe what this flow does..."
              value={flow.description || ''}
              onChange={(e) => updateFlow({ description: e.target.value })}
              rows={2}
            />
          </section>

          {/* Steps */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Steps ({flow.steps.length})
              </h2>
              <Button variant="outline" size="sm" onClick={addRootStep}>
                <Plus className="mr-1.5 h-3 w-3" />
                Add Step
              </Button>
            </div>

            {flow.steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10">
                <GitBranch className="mb-3 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No steps yet. Add your first step.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addRootStep}
                >
                  <Plus className="mr-1.5 h-3 w-3" />
                  Add Step
                </Button>
              </div>
            ) : (
              <div className="space-y-1">
                {flow.steps.map((step, index) => (
                  <FlowStepNode
                    key={index}
                    step={step}
                    stepIndex={index}
                    depth={0}
                    templates={templates}
                    onUpdate={(u) => handleUpdateStep(index, u)}
                    onRemove={() => handleRemoveStep(index)}
                    onAddStep={addRootStep}
                    isLast={index === flow.steps.length - 1}
                    isSelected={
                      selectedPath !== null &&
                      selectedPath.length === 1 &&
                      selectedPath[0] === index
                    }
                    onSelect={() => {
                      const currentPath = selectedPath;
                      const newPath = [index];
                      if (currentPath && pathEquals(currentPath, newPath)) {
                        selectStep(null); // deselect on re-click
                      } else {
                        selectStep(newPath);
                      }
                    }}
                    onSelectChild={(branchIndex, stepIndex) => {
                      selectStep([index, branchIndex, stepIndex]);
                    }}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Fallback Config */}
          <section className="space-y-3 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                Fallback / No-Reply Nudge
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              If the contact does not reply, send a nudge after a delay.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Nudge Template</Label>
                <select
                  value={flow.fallback?.template || ''}
                  onChange={(e) =>
                    updateFallback({ template: e.target.value })
                  }
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">None (disabled)</option>
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Delay (minutes)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  value={flow.fallback?.delayMinutes || ''}
                  onChange={(e) =>
                    updateFallback({
                      delayMinutes: e.target.value
                        ? parseInt(e.target.value)
                        : 60,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </section>
        </div>

        {/* ─── Pinned Preview (inline column) ─── */}
        {previewMode === 'pinned' && (
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">
                    {selectedStep ? 'Step Preview' : 'Flow Preview'}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {selectedStep && (
                    <button
                      type="button"
                      onClick={() => selectStep(null)}
                      title="Show full flow"
                      className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      Full flow
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewMode('pinned')}
                    title="Pinned to side"
                    className="rounded-md p-1 text-primary bg-primary/10"
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('closed')}
                    title="Close preview"
                    className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <FlowPhonePreview
                steps={flow.steps}
                templates={templates}
                focusedStep={selectedStep}
              />
              <p className="text-center text-[10px] text-muted-foreground">
                {selectedStep
                  ? 'Showing selected step'
                  : 'Click buttons to explore branches'}
              </p>
            </div>
          </div>
        )}

        {/* ─── AI Chat Panel (inline column) ─── */}
        {aiPanelOpen && (
          <div className="hidden lg:block">
            <div className="sticky top-6 h-[calc(100vh-120px)] overflow-hidden rounded-xl border border-border bg-card">
              <AiChatPanel />
            </div>
          </div>
        )}
      </div>

      {/* ─── FAB: open preview ─── */}
      {previewMode === 'closed' && (
        <button
          type="button"
          onClick={() => setPreviewMode('floating')}
          className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <Smartphone className="h-4 w-4" />
          Preview
        </button>
      )}

      {/* ─── Floating Preview (overlay) ─── */}
      {previewMode === 'floating' && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setPreviewMode('closed')}
          />

          <div className="fixed right-4 top-4 bottom-4 z-50 flex w-[360px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">
                  {selectedStep ? 'Step Preview' : 'Flow Preview'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {selectedStep && (
                  <button
                    type="button"
                    onClick={() => selectStep(null)}
                    title="Show full flow"
                    className="rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Full flow
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreviewMode('pinned')}
                  title="Pin to side"
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <Pin className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('closed')}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto px-2 py-4">
              <FlowPhonePreview
                steps={flow.steps}
                templates={templates}
                focusedStep={selectedStep}
              />
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                {selectedStep
                  ? 'Showing selected step'
                  : 'Click buttons to explore branches'}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ─── Mobile AI Chat (overlay for small screens) ─── */}
      {aiPanelOpen && (
        <div className="fixed right-4 top-4 bottom-4 z-50 flex w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl lg:hidden">
          <AiChatPanel />
        </div>
      )}
    </div>
  );
}
