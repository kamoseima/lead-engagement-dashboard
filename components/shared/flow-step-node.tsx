'use client';

import { useMemo } from 'react';
import { Plus, Trash2, GitBranch, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FlowStep, FlowBranch, BranchType } from '@/types/database';
import type { Template } from '@/services/templates/template.service';

// ── Depth-based lane colors ────────────────────────────────
const DEPTH_COLORS = ['#22D3EE', '#818CF8', '#34D399', '#FBBF24', '#F87171'];

// ── Template types that have actionable buttons ────────────
const BUTTON_TYPES = new Set(['quick-reply', 'card', 'call-to-action']);

// ════════════════════════════════════════════════════════════
// Auto-branch generator: extract branches from a template
// ════════════════════════════════════════════════════════════
export function getBranchesForTemplate(tpl: Template | undefined): FlowBranch[] {
  if (!tpl) return [];
  const type = tpl.type;

  // Quick-reply, card, call-to-action: branches from buttons
  if (BUTTON_TYPES.has(type) && tpl.buttons && tpl.buttons.length > 0) {
    return tpl.buttons
      .filter((b) => b.text)
      .map((b) => ({
        buttonLabel: b.text,
        buttonType: (b.type || 'QUICK_REPLY') as BranchType,
        steps: [],
      }));
  }

  return [];
}

/** Get all button labels from a template (for the branch dropdown) */
function getTemplateButtonLabels(tpl: Template | undefined): string[] {
  if (!tpl) return [];
  if (BUTTON_TYPES.has(tpl.type) && tpl.buttons) {
    return tpl.buttons.filter((b) => b.text).map((b) => b.text);
  }
  return [];
}

// ════════════════════════════════════════════════════════════
// FlowStepNode
// ════════════════════════════════════════════════════════════

interface FlowStepNodeProps {
  step: FlowStep;
  stepIndex: number;
  depth: number;
  templates: Template[];
  onUpdate: (updates: Partial<FlowStep>) => void;
  onRemove: () => void;
  onAddStep?: () => void;
  isLast: boolean;
}

export function FlowStepNode({
  step,
  stepIndex,
  depth,
  templates,
  onUpdate,
  onRemove,
  onAddStep,
  isLast,
}: FlowStepNodeProps) {
  const laneColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  // Find the currently selected template
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.name === step.template),
    [templates, step.template]
  );

  // Button labels from the selected template (for dropdowns)
  const templateButtons = useMemo(
    () => getTemplateButtonLabels(selectedTemplate),
    [selectedTemplate]
  );

  // Which button labels are already claimed by existing branches
  const claimedLabels = useMemo(() => {
    if (!step.branches) return new Set<string>();
    return new Set(
      step.branches
        .filter((b) => b.buttonType !== 'CUSTOM')
        .map((b) => b.buttonLabel)
    );
  }, [step.branches]);

  // Does this template have buttons? Determines dropdown vs text input
  const hasButtons = templateButtons.length > 0;

  // ── Template selection with auto-branching ───────────────
  const handleTemplateChange = (templateName: string) => {
    const tpl = templates.find((t) => t.name === templateName);

    const oldBranches = step.branches || [];
    const customBranches = oldBranches.filter((b) => b.buttonType === 'CUSTOM');
    const newBranches = getBranchesForTemplate(tpl);

    // Preserve child steps for branches with matching labels
    newBranches.forEach((nb) => {
      const match = oldBranches.find(
        (ob) => ob.buttonLabel === nb.buttonLabel && ob.buttonType !== 'CUSTOM'
      );
      if (match) {
        nb.steps = match.steps;
      }
    });

    // Auto-set label from template name
    const label = templateName
      ? templateName.replace(/_/g, ' ')
      : 'New Step';

    onUpdate({
      template: templateName,
      templateType: tpl?.type || '',
      label,
      branches: [...newBranches, ...customBranches],
    });
  };

  // ── Manual branch (for body-option templates) ────────────
  const addManualBranch = () => {
    const branches = step.branches || [];
    const branchNum = branches.length + 1;

    // If template has unclaimed buttons, suggest the next one
    const unclaimed = templateButtons.find((btn) => !claimedLabels.has(btn));

    onUpdate({
      branches: [
        ...branches,
        {
          buttonLabel: unclaimed || `Option ${branchNum}`,
          buttonType: unclaimed ? 'QUICK_REPLY' : 'CUSTOM',
          steps: [],
        },
      ],
    });
  };

  const removeBranch = (bIndex: number) => {
    const branches = [...(step.branches || [])];
    branches.splice(bIndex, 1);
    onUpdate({ branches });
  };

  const updateBranch = (bIndex: number, updates: Partial<FlowBranch>) => {
    const branches = [...(step.branches || [])];
    branches[bIndex] = { ...branches[bIndex], ...updates };
    onUpdate({ branches });
  };

  const updateBranchStep = (
    bIndex: number,
    sIndex: number,
    updates: Partial<FlowStep>
  ) => {
    const branches = [...(step.branches || [])];
    const branchSteps = [...branches[bIndex].steps];
    branchSteps[sIndex] = { ...branchSteps[sIndex], ...updates };
    branches[bIndex] = { ...branches[bIndex], steps: branchSteps };
    onUpdate({ branches });
  };

  const removeBranchStep = (bIndex: number, sIndex: number) => {
    const branches = [...(step.branches || [])];
    const branchSteps = [...branches[bIndex].steps];
    branchSteps.splice(sIndex, 1);
    branches[bIndex] = { ...branches[bIndex], steps: branchSteps };
    onUpdate({ branches });
  };

  const addBranchStep = (bIndex: number) => {
    const branches = [...(step.branches || [])];
    const branchSteps = [...branches[bIndex].steps];
    branchSteps.push({ template: '', label: 'New Step' });
    branches[bIndex] = { ...branches[bIndex], steps: branchSteps };
    onUpdate({ branches });
  };

  // ── Branch label control: dropdown or text input ─────────
  const renderBranchLabel = (branch: FlowBranch, bIndex: number) => {
    if (hasButtons) {
      // Dropdown mode: pick from template's buttons + custom option
      const isCustom =
        branch.buttonType === 'CUSTOM' ||
        !templateButtons.includes(branch.buttonLabel);

      return (
        <select
          value={isCustom ? '__custom__' : branch.buttonLabel}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              updateBranch(bIndex, {
                buttonLabel: branch.buttonLabel,
                buttonType: 'CUSTOM',
              });
            } else {
              updateBranch(bIndex, {
                buttonLabel: e.target.value,
                buttonType: 'QUICK_REPLY',
              });
            }
          }}
          className="h-7 min-w-0 flex-1 rounded border border-input bg-background px-1.5 text-[11px] font-semibold"
        >
          {templateButtons.map((btn) => {
            const isCurrent = btn === branch.buttonLabel;
            const isClaimed = !isCurrent && claimedLabels.has(btn);
            if (isClaimed) return null;
            return (
              <option key={btn} value={btn}>
                {btn}
              </option>
            );
          })}
          <option value="__custom__">
            {isCustom ? `Custom: ${branch.buttonLabel}` : 'Custom...'}
          </option>
        </select>
      );
    }

    // Text input mode: free-form for body-option templates
    return (
      <Input
        placeholder="Branch label"
        value={branch.buttonLabel}
        onChange={(e) =>
          updateBranch(bIndex, {
            buttonLabel: e.target.value,
            buttonType: 'CUSTOM',
          })
        }
        className="h-7 flex-1 text-[11px] font-semibold"
      />
    );
  };

  return (
    <div className="relative">
      {/* Connector line from previous step */}
      {stepIndex > 0 && (
        <div className="absolute -top-3 left-5 h-3 w-px border-l-2 border-dashed border-primary/20" />
      )}

      {/* Step Card */}
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/20">
        <div className="flex items-start gap-3">
          {/* Step Number */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {stepIndex + 1}
          </div>

          {/* Fields */}
          <div className="min-w-0 flex-1 space-y-3">
            {/* Label */}
            <Input
              placeholder="Step label"
              value={step.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="h-8 border-none bg-transparent text-sm font-semibold focus-visible:ring-0"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Template Selector */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  Template
                </label>
                <select
                  value={step.template || ''}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">Select template...</option>
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name} ({t.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Delay */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                  <Clock className="mr-1 inline h-3 w-3" />
                  Delay (minutes)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={step.delayMinutes || ''}
                  onChange={(e) =>
                    onUpdate({
                      delayMinutes: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Branch Lanes */}
            {step.branches && step.branches.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: laneColor }}
                  />
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    <GitBranch className="mr-1 inline h-3 w-3" />
                    Response Branches ({step.branches.length})
                  </p>
                </div>

                <div className="space-y-3">
                  {step.branches.map((branch, bIndex) => (
                    <div
                      key={bIndex}
                      className="overflow-hidden rounded-lg border border-border bg-background"
                      style={{ borderLeftColor: laneColor, borderLeftWidth: 3 }}
                    >
                      {/* Branch Header */}
                      <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
                        <span
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                          style={{ background: laneColor }}
                        >
                          {bIndex + 1}
                        </span>
                        {renderBranchLabel(branch, bIndex)}
                        <span className="shrink-0 text-[9px] text-muted-foreground">
                          {branch.steps.length} step
                          {branch.steps.length !== 1 ? 's' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeBranch(bIndex)}
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Branch Sub-Steps (recursive) */}
                      <div className="space-y-2 p-3">
                        {branch.steps.map((subStep, sIndex) => (
                          <FlowStepNode
                            key={sIndex}
                            step={subStep}
                            stepIndex={sIndex}
                            depth={depth + 1}
                            templates={templates}
                            onUpdate={(u) =>
                              updateBranchStep(bIndex, sIndex, u)
                            }
                            onRemove={() => removeBranchStep(bIndex, sIndex)}
                            isLast={sIndex === branch.steps.length - 1}
                          />
                        ))}

                        {/* Add sub-step */}
                        <button
                          type="button"
                          onClick={() => addBranchStep(bIndex)}
                          className="flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                        >
                          <Plus className="h-3 w-3" />
                          {branch.steps.length === 0
                            ? 'Add first step'
                            : 'Add step'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={addManualBranch}
              title="Add branch"
            >
              <GitBranch className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={onRemove}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Connector to next step */}
      {!isLast && (
        <div className="ml-5 flex h-6 items-center">
          <div className="h-full w-px border-l-2 border-dashed border-primary/20" />
          <svg
            className="absolute ml-[14px] mt-6 text-primary/20"
            width="10"
            height="8"
            viewBox="0 0 10 8"
          >
            <polygon points="5,8 0,0 10,0" fill="currentColor" />
          </svg>
        </div>
      )}

      {/* Add step button after last step (root level only) */}
      {isLast && depth === 0 && onAddStep && (
        <div className="mt-3">
          <button
            type="button"
            onClick={onAddStep}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Step
          </button>
        </div>
      )}
    </div>
  );
}
