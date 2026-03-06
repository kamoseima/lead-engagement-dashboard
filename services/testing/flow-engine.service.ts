/**
 * Flow Engine Service
 *
 * Processes inbound WhatsApp replies against test run flows.
 * Matches reply text to branch labels, advances flow position,
 * and sends the next template via the platform API.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { platformApi } from '@/lib/platform-api';
import { listTemplates } from '@/services/templates/template.service';
import type { FlowStep, FlowBranch, TestRun } from '@/types/database';

// ── Flow state persisted in test_runs.flow_state ──────────────────────────

export interface FlowState {
  flowId: string;
  /** Path to current step: [stepIndex] or [stepIndex, branchIndex, subStepIndex, ...] */
  stepPath: number[];
  retryCount: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Navigate the recursive flow step tree to find the step at a given path.
 * stepPath = [0] means steps[0]
 * stepPath = [0, 1, 0] means steps[0].branches[1].steps[0]
 */
function resolveStep(steps: FlowStep[], stepPath: number[]): FlowStep | null {
  if (stepPath.length === 0) return null;

  let current: FlowStep[] = steps;
  for (let i = 0; i < stepPath.length; i++) {
    const idx = stepPath[i];
    if (idx < 0 || idx >= current.length) return null;

    if (i === stepPath.length - 1) {
      return current[idx];
    }

    // Next element in path is a branch index, then a step index within that branch
    const step = current[idx];
    const branchIdx = stepPath[i + 1];
    if (!step.branches || branchIdx < 0 || branchIdx >= step.branches.length) return null;

    current = step.branches[branchIdx].steps;
    i++; // skip the branch index since we consumed it
  }

  return null;
}

/**
 * Get the steps array that contains the current step.
 */
function resolveParentSteps(steps: FlowStep[], stepPath: number[]): FlowStep[] {
  if (stepPath.length <= 1) return steps;

  let current: FlowStep[] = steps;
  // Navigate pairs: [stepIdx, branchIdx, stepIdx, branchIdx, ...]
  for (let i = 0; i < stepPath.length - 1; i += 2) {
    const stepIdx = stepPath[i];
    const branchIdx = stepPath[i + 1];
    if (stepIdx === undefined || branchIdx === undefined) break;
    const step = current[stepIdx];
    if (!step?.branches?.[branchIdx]) break;
    current = step.branches[branchIdx].steps;
  }

  return current;
}

// ── Core engine ───────────────────────────────────────────────────────────

export async function processInboundForTestRun(
  testRun: TestRun,
  inboundBody: string
): Promise<{ advanced: boolean; error?: string }> {
  const flowState = testRun.flow_state as FlowState | null;
  if (!flowState) {
    return { advanced: false, error: 'No flow state on test run' };
  }

  const supabase = createAdminClient();

  // Load the flow
  const { data: flow, error: flowErr } = await supabase
    .from('flows')
    .select('*')
    .eq('id', flowState.flowId)
    .single();

  if (flowErr || !flow) {
    return { advanced: false, error: 'Could not load flow' };
  }

  const steps = (flow.steps || []) as FlowStep[];
  const currentStep = resolveStep(steps, flowState.stepPath);

  if (!currentStep || !currentStep.branches || currentStep.branches.length === 0) {
    return { advanced: false, error: 'Current step has no branches' };
  }

  // Match inbound body against branch labels
  const bodyLower = (inboundBody || '').trim().toLowerCase();
  let matchedBranch: FlowBranch | null = null;
  let matchedBranchIdx = -1;

  // 1. Exact match (case-insensitive)
  for (let i = 0; i < currentStep.branches.length; i++) {
    const label = (currentStep.branches[i].buttonLabel || '').toLowerCase().trim();
    if (label && bodyLower === label) {
      matchedBranch = currentStep.branches[i];
      matchedBranchIdx = i;
      break;
    }
  }

  // 2. Numbered reply (1, 2, 3...)
  if (!matchedBranch) {
    const num = parseInt(inboundBody.trim());
    if (num >= 1 && num <= currentStep.branches.length) {
      matchedBranch = currentStep.branches[num - 1];
      matchedBranchIdx = num - 1;
    }
  }

  // 3. Partial match
  if (!matchedBranch) {
    for (let i = 0; i < currentStep.branches.length; i++) {
      const label = (currentStep.branches[i].buttonLabel || '').toLowerCase().trim();
      if (label && (bodyLower.includes(label) || label.includes(bodyLower))) {
        matchedBranch = currentStep.branches[i];
        matchedBranchIdx = i;
        break;
      }
    }
  }

  const now = new Date().toISOString();
  const messages = [...(testRun.messages || [])];

  // Record the inbound message
  messages.push({
    direction: 'inbound' as const,
    body: inboundBody,
    timestamp: now,
  });

  if (!matchedBranch) {
    // No match — increment retry, check max
    const newRetry = flowState.retryCount + 1;
    const maxRetries = 2;

    if (newRetry > maxRetries) {
      // Exceeded retries — complete the test
      messages.push({
        direction: 'outbound' as const,
        body: 'Flow ended (max retries exceeded)',
        timestamp: now,
        status: 'info',
      });

      await supabase
        .from('test_runs')
        .update({
          status: 'completed',
          messages,
          completed_at: now,
          flow_state: { ...flowState, retryCount: newRetry },
        })
        .eq('id', testRun.id);

      return { advanced: false, error: 'Max retries exceeded' };
    }

    // Update retry count
    await supabase
      .from('test_runs')
      .update({
        messages,
        flow_state: { ...flowState, retryCount: newRetry },
      })
      .eq('id', testRun.id);

    return { advanced: false, error: `No branch matched (retry ${newRetry}/${maxRetries})` };
  }

  // Branch matched — navigate into it
  console.log(`[flow-engine] Branch matched: "${matchedBranch.buttonLabel}" for test ${testRun.id}`);

  if (!matchedBranch.steps || matchedBranch.steps.length === 0) {
    // Branch has no sub-steps — flow complete
    messages.push({
      direction: 'outbound' as const,
      body: `Branch "${matchedBranch.buttonLabel}" — no further steps`,
      timestamp: now,
      status: 'info',
    });

    await supabase
      .from('test_runs')
      .update({
        status: 'completed',
        messages,
        completed_at: now,
        flow_state: { ...flowState, retryCount: 0 },
      })
      .eq('id', testRun.id);

    return { advanced: true };
  }

  // Send the first step in the matched branch
  const nextStep = matchedBranch.steps[0];
  const newStepPath = [...flowState.stepPath, matchedBranchIdx, 0];

  if (nextStep.template) {
    const sendResult = await sendStepTemplate(testRun.org_id, testRun.lead_phone, nextStep.template, testRun.variables || {});

    messages.push({
      direction: 'outbound' as const,
      body: `Template: ${nextStep.template}`,
      template: nextStep.template,
      timestamp: new Date().toISOString(),
      status: sendResult.success ? 'sent' : 'failed',
    });

    if (!sendResult.success) {
      await supabase
        .from('test_runs')
        .update({
          status: 'failed',
          error: sendResult.error,
          messages,
          flow_state: { ...flowState, stepPath: newStepPath, retryCount: 0 },
        })
        .eq('id', testRun.id);

      return { advanced: false, error: sendResult.error };
    }
  }

  // Determine next state: if this step has branches, wait for reply; otherwise advance
  const hasMoreBranches = nextStep.branches && nextStep.branches.length > 0;
  const hasNextSibling = matchedBranch.steps.length > 1;

  // For now: if step has branches, wait for reply. If not and there are more steps,
  // auto-advance (send them all). Otherwise complete.
  let finalStatus: string = 'waiting_reply';
  let finalPath = newStepPath;

  if (!hasMoreBranches) {
    // Send remaining sibling steps in this branch
    for (let i = 1; i < matchedBranch.steps.length; i++) {
      const siblingStep = matchedBranch.steps[i];
      if (siblingStep.template) {
        const sibResult = await sendStepTemplate(testRun.org_id, testRun.lead_phone, siblingStep.template, testRun.variables || {});
        messages.push({
          direction: 'outbound' as const,
          body: `Template: ${siblingStep.template}`,
          template: siblingStep.template,
          timestamp: new Date().toISOString(),
          status: sibResult.success ? 'sent' : 'failed',
        });
      }

      // If this sibling has branches, wait for reply on it
      if (siblingStep.branches && siblingStep.branches.length > 0) {
        finalPath = [...flowState.stepPath, matchedBranchIdx, i];
        finalStatus = 'waiting_reply';
        break;
      }

      // If this is the last sibling, flow is complete
      if (i === matchedBranch.steps.length - 1) {
        finalStatus = 'completed';
      }
    }

    if (finalStatus === 'completed' && !hasNextSibling) {
      finalStatus = 'completed';
    }
  }

  await supabase
    .from('test_runs')
    .update({
      status: finalStatus,
      messages,
      ...(finalStatus === 'completed' ? { completed_at: new Date().toISOString() } : {}),
      flow_state: { ...flowState, stepPath: finalPath, retryCount: 0 },
    })
    .eq('id', testRun.id);

  return { advanced: true };
}

// ── Send a template step ──────────────────────────────────────────────────

async function sendStepTemplate(
  orgId: string,
  phone: string,
  templateName: string,
  variables: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  // Resolve content_sid from template name
  const templatesResult = await listTemplates(orgId);
  if (!templatesResult.success) {
    return { success: false, error: 'Could not list templates' };
  }

  const match = templatesResult.data.find(t => t.name === templateName);
  if (!match?.content_sid) {
    return { success: false, error: `Template "${templateName}" not found` };
  }

  // Build content_variables — use provided or empty
  const contentVars: Record<string, string> = {};
  if (variables && Object.keys(variables).length > 0) {
    // Only include numbered keys with non-empty values
    for (const [k, v] of Object.entries(variables)) {
      if (/^\d+$/.test(k) && v != null && String(v).trim() !== '') {
        contentVars[k] = String(v);
      }
    }
  }

  const body: Record<string, unknown> = {
    to: phone,
    content_sid: match.content_sid,
    event_type: 'test_flow',
  };

  if (Object.keys(contentVars).length > 0) {
    body.content_variables = contentVars;
  }

  const result = await platformApi<{ provider_message_id: string }>(
    '/api/v1/messages/send/whatsapp',
    {
      method: 'POST',
      body,
      orgId,
    }
  );

  if (!result.success) {
    return { success: false, error: result.error.message };
  }

  return { success: true };
}
