'use client';

import { create } from 'zustand';
import type { Flow, FlowStep, FlowBranch, FlowFallback } from '@/types/database';
import type { Template } from '@/services/templates/template.service';
import { getBranchesForTemplate } from '@/components/shared/flow-step-node';

// ── Step path addressing ──────────────────────────────────
// A StepPath uniquely identifies a step within the nested tree.
// e.g. [2] = root step index 2
//      [0, 1, 0] = root step 0 → branch 1 → sub-step 0

export type StepPath = number[];

function pathEquals(a: StepPath, b: StepPath): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Read a step from the flow tree at the given path */
function getStepAtPath(steps: FlowStep[], path: StepPath): FlowStep | null {
  if (path.length === 0) return null;
  const [head, ...tail] = path;

  if (head < 0 || head >= steps.length) return null;
  const step = steps[head];

  if (tail.length === 0) return step;
  // tail format: [branchIndex, subStepIndex, ...]
  if (tail.length < 2) return null;

  const branchIdx = tail[0];
  const subStepIdx = tail[1];
  const branches = step.branches || [];
  if (branchIdx < 0 || branchIdx >= branches.length) return null;

  const branch = branches[branchIdx];
  if (subStepIdx < 0 || subStepIdx >= branch.steps.length) return null;

  if (tail.length === 2) return branch.steps[subStepIdx];
  return getStepAtPath(branch.steps, [subStepIdx, ...tail.slice(2)]);
}

/** Immutably update a step at the given path */
function updateStepAtPath(
  steps: FlowStep[],
  path: StepPath,
  updates: Partial<FlowStep>
): FlowStep[] {
  if (path.length === 0) return steps;
  const [head, ...tail] = path;
  const newSteps = [...steps];

  if (tail.length === 0) {
    newSteps[head] = { ...newSteps[head], ...updates };
    return newSteps;
  }

  const branchIdx = tail[0];
  const subStepIdx = tail[1];
  const step = { ...newSteps[head] };
  const branches = [...(step.branches || [])];
  const branch = { ...branches[branchIdx] };
  const branchSteps = [...branch.steps];

  if (tail.length === 2) {
    branchSteps[subStepIdx] = { ...branchSteps[subStepIdx], ...updates };
  } else {
    const subPath = [subStepIdx, ...tail.slice(2)];
    const updated = updateStepAtPath(branchSteps, subPath, updates);
    branchSteps.splice(0, branchSteps.length, ...updated);
  }

  branch.steps = branchSteps;
  branches[branchIdx] = branch;
  step.branches = branches;
  newSteps[head] = step;
  return newSteps;
}

/** Remove a step at the given path */
function removeStepAtPath(steps: FlowStep[], path: StepPath): FlowStep[] {
  if (path.length === 0) return steps;
  const [head, ...tail] = path;

  if (tail.length === 0) {
    return steps.filter((_, i) => i !== head);
  }

  const branchIdx = tail[0];
  const subStepIdx = tail[1];
  const newSteps = [...steps];
  const step = { ...newSteps[head] };
  const branches = [...(step.branches || [])];
  const branch = { ...branches[branchIdx] };
  const branchSteps = [...branch.steps];

  if (tail.length === 2) {
    branchSteps.splice(subStepIdx, 1);
  } else {
    const subPath = [subStepIdx, ...tail.slice(2)];
    branch.steps = removeStepAtPath(branchSteps, subPath);
  }

  branch.steps = branchSteps;
  branches[branchIdx] = branch;
  step.branches = branches;
  newSteps[head] = step;
  return newSteps;
}

/** Add a step inside a branch at the given parent path */
function addStepInBranch(
  steps: FlowStep[],
  parentPath: StepPath,
  branchIndex: number,
  newStep: FlowStep
): FlowStep[] {
  if (parentPath.length === 0) return steps;
  const [head, ...tail] = parentPath;
  const newSteps = [...steps];

  if (tail.length === 0) {
    const step = { ...newSteps[head] };
    const branches = [...(step.branches || [])];
    if (branchIndex < 0 || branchIndex >= branches.length) return steps;
    const branch = { ...branches[branchIndex] };
    branch.steps = [...branch.steps, newStep];
    branches[branchIndex] = branch;
    step.branches = branches;
    newSteps[head] = step;
    return newSteps;
  }

  // Recurse deeper
  const branchIdx = tail[0];
  const subStepIdx = tail[1];
  const step = { ...newSteps[head] };
  const branches = [...(step.branches || [])];
  const branch = { ...branches[branchIdx] };
  branch.steps = addStepInBranch(branch.steps, [subStepIdx, ...tail.slice(2)], branchIndex, newStep);
  branches[branchIdx] = branch;
  step.branches = branches;
  newSteps[head] = step;
  return newSteps;
}

// ── Store interface ───────────────────────────────────────

interface FlowEditorState {
  // Core data
  flow: Flow | null;
  templates: Template[];
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;

  // Step selection
  selectedPath: StepPath | null;
  selectedStep: FlowStep | null;

  // Preview mode
  previewMode: 'closed' | 'floating' | 'pinned';

  // AI chat
  aiPanelOpen: boolean;

  // Actions — data loading
  setFlow: (flow: Flow | null) => void;
  setTemplates: (templates: Template[]) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;

  // Actions — flow mutations
  updateFlow: (updates: Partial<Flow>) => void;
  addRootStep: () => void;
  removeStep: (path: StepPath) => void;
  updateStep: (path: StepPath, updates: Partial<FlowStep>) => void;
  updateFallback: (updates: Partial<FlowFallback>) => void;

  // Actions — step selection
  selectStep: (path: StepPath | null) => void;

  // Actions — preview
  setPreviewMode: (mode: 'closed' | 'floating' | 'pinned') => void;

  // Actions — AI panel
  setAiPanelOpen: (open: boolean) => void;

  // Actions — AI mutations (called by AI tools)
  setTemplateForStep: (path: StepPath, templateName: string) => void;
  addBranchStep: (parentPath: StepPath, branchIndex: number, templateName: string) => void;
  addBranch: (path: StepPath, label: string) => void;
}

export const useFlowEditorStore = create<FlowEditorState>((set, get) => ({
  // Initial state
  flow: null,
  templates: [],
  isLoading: true,
  isSaving: false,
  hasChanges: false,
  selectedPath: null,
  selectedStep: null,
  previewMode: 'closed',
  aiPanelOpen: false,

  // Data loading
  setFlow: (flow) => set({ flow, hasChanges: false }),
  setTemplates: (templates) => set({ templates }),
  setLoading: (isLoading) => set({ isLoading }),
  setSaving: (isSaving) => set({ isSaving }),

  // Flow mutations
  updateFlow: (updates) => {
    const { flow } = get();
    if (!flow) return;
    set({ flow: { ...flow, ...updates }, hasChanges: true });
  },

  addRootStep: () => {
    const { flow } = get();
    if (!flow) return;
    const newStep: FlowStep = { template: '', label: 'New Step' };
    set({
      flow: { ...flow, steps: [...flow.steps, newStep] },
      hasChanges: true,
    });
  },

  removeStep: (path) => {
    const { flow, selectedPath } = get();
    if (!flow) return;
    const newSteps = removeStepAtPath(flow.steps, path);
    const deselect = selectedPath && pathEquals(selectedPath, path);
    set({
      flow: { ...flow, steps: newSteps },
      hasChanges: true,
      ...(deselect ? { selectedPath: null, selectedStep: null } : {}),
    });
  },

  updateStep: (path, updates) => {
    const { flow, selectedPath } = get();
    if (!flow) return;
    const newSteps = updateStepAtPath(flow.steps, path, updates);
    const updatedFlow = { ...flow, steps: newSteps };
    const isSelected = selectedPath && pathEquals(selectedPath, path);
    set({
      flow: updatedFlow,
      hasChanges: true,
      ...(isSelected ? { selectedStep: getStepAtPath(newSteps, path) } : {}),
    });
  },

  updateFallback: (updates) => {
    const { flow } = get();
    if (!flow) return;
    const current = flow.fallback || { template: '', delayMinutes: 60 };
    set({
      flow: { ...flow, fallback: { ...current, ...updates } },
      hasChanges: true,
    });
  },

  // Step selection
  selectStep: (path) => {
    const { flow } = get();
    if (!path || !flow) {
      set({ selectedPath: null, selectedStep: null });
      return;
    }
    const step = getStepAtPath(flow.steps, path);
    set({ selectedPath: path, selectedStep: step });
  },

  // Preview
  setPreviewMode: (previewMode) => set({ previewMode }),

  // AI panel
  setAiPanelOpen: (aiPanelOpen) => set({ aiPanelOpen }),

  // AI mutations
  setTemplateForStep: (path, templateName) => {
    const { flow, templates } = get();
    if (!flow) return;

    const tpl = templates.find((t) => t.name === templateName);
    const newBranches = getBranchesForTemplate(tpl);
    const label = templateName ? templateName.replace(/_/g, ' ') : 'New Step';

    get().updateStep(path, {
      template: templateName,
      templateType: tpl?.type || '',
      label,
      branches: newBranches,
    });
  },

  addBranchStep: (parentPath, branchIndex, templateName) => {
    const { flow, templates } = get();
    if (!flow) return;

    const tpl = templates.find((t) => t.name === templateName);
    const newStep: FlowStep = {
      template: templateName,
      templateType: tpl?.type || '',
      label: templateName ? templateName.replace(/_/g, ' ') : 'New Step',
      branches: getBranchesForTemplate(tpl),
    };

    const newSteps = addStepInBranch(flow.steps, parentPath, branchIndex, newStep);
    set({
      flow: { ...flow, steps: newSteps },
      hasChanges: true,
    });
  },

  addBranch: (path, label) => {
    const { flow } = get();
    if (!flow) return;

    const step = getStepAtPath(flow.steps, path);
    if (!step) return;

    const branches = step.branches || [];
    get().updateStep(path, {
      branches: [
        ...branches,
        { buttonLabel: label, buttonType: 'CUSTOM', steps: [] },
      ],
    });
  },
}));

// Export helpers for external use
export { pathEquals, getStepAtPath };
