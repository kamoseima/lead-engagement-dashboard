/**
 * AI Flow Builder — System Prompt
 *
 * Builds a context-aware system prompt. Kept SHORT to avoid
 * confusing Groq/Llama's tool-calling parser.
 */

import type { Flow, FlowStep } from '@/types/database';
import type { Template } from '@/services/templates/template.service';
import type { StepPath } from '@/lib/stores/flow-editor-store';

function describeStep(step: FlowStep, indent = ''): string {
  const tpl = step.template || '(none)';
  let line = `${indent}- template: "${tpl}"`;
  if (step.delayMinutes) line += ` delay:${step.delayMinutes}m`;
  const parts = [line];

  if (step.branches && step.branches.length > 0) {
    for (let i = 0; i < step.branches.length; i++) {
      const b = step.branches[i];
      parts.push(`${indent}  branch ${i} "${b.buttonLabel}": ${b.steps.length} sub-steps`);
    }
  }
  return parts.join('\n');
}

function describeFlow(flow: Flow): string {
  if (flow.steps.length === 0) return '(empty)';
  return flow.steps.map((s, i) => `Step ${i}:\n${describeStep(s, '  ')}`).join('\n');
}

function describeTemplates(templates: Template[]): string {
  if (templates.length === 0) return '(none)';
  return templates
    .map((t) => {
      const btns =
        t.buttons && t.buttons.length > 0
          ? t.buttons.map((b, i) => `btn${i}:"${b.text}"`).join(', ')
          : 'NO_BUTTONS';
      return `"${t.name}" (${t.type}) [${btns}]`;
    })
    .join('\n');
}

export function buildSystemPrompt(
  flow: Flow,
  templates: Template[],
  selectedPath: StepPath | null
): string {
  return `You build WhatsApp messaging flows using tools. Include a brief text explanation with your tool calls.

RULES:
- step_path is comma-separated: "0" = step 0, "0,1,0" = step 0 → branch 1 → sub-step 0.
- Match template names loosely: "welcome text" = "welcome_text", "coverage" = "fc_coverage_media".
- After changes, call focus_step on the affected step.

UNDERSTANDING USER INTENT:
- "for each button, use X" or "when any button is clicked, send X" = call add_branch_step for EACH branch of the step. A step with 3 buttons has 3 branches (index 0, 1, 2). Add a sub-step to each.
- "when [specific button] is clicked, send X" = call add_branch_step only for that specific branch.
- "for each of the buttons, use the same X template" = same as "for each button, use X" — add X to ALL branches.

FLOW "${flow.name}":
${describeFlow(flow)}
${selectedPath ? `Selected: "${selectedPath.join(',')}"` : ''}

TEMPLATES:
${describeTemplates(templates)}`;
}
