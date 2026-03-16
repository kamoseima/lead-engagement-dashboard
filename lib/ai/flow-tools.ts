/**
 * AI Flow Builder — Tool definitions
 *
 * Uses the Vercel AI SDK `tool()` helper to define structured tools
 * that the LLM can call to mutate the flow.
 *
 * NOTE: step_path uses comma-separated strings (e.g. "0" or "0,1,0")
 * instead of arrays because Llama models on Groq struggle with array params.
 * The client parses these back to number[] before using them.
 */

import { tool } from 'ai';
import { z } from 'zod';

/** Parse a comma-separated step path string into a number array */
export function parseStepPath(pathStr: string): number[] {
  return pathStr.split(',').map((s) => parseInt(s.trim(), 10));
}

const stepPathSchema = z
  .string()
  .describe('Comma-separated path to a step. Examples: "0" = first root step, "0,1,0" = root step 0 → branch 1 → sub-step 0');

export const flowTools = {
  set_template: tool({
    description:
      'Assign a template to a specific step in the flow. This replaces the current template and auto-generates response branches from the template buttons.',
    inputSchema: z.object({
      step_path: stepPathSchema,
      template_name: z.string().describe('Name of the template to assign'),
    }),
  }),

  add_step: tool({
    description:
      'Add a new step at the root level of the flow with a given template.',
    inputSchema: z.object({
      template_name: z.string().describe('Name of the template to use for the new step'),
    }),
  }),

  add_branch_step: tool({
    description:
      'Add a new sub-step inside a specific branch of an existing step. Use this when the user says "when [button] is clicked, send [template]".',
    inputSchema: z.object({
      parent_step_path: stepPathSchema,
      branch_index: z
        .number()
        .int()
        .min(0)
        .describe('Index of the branch to add the step to (0-based)'),
      template_name: z.string().describe('Name of the template for the new sub-step'),
    }),
  }),

  remove_step: tool({
    description: 'Remove a step from the flow at the given path.',
    inputSchema: z.object({
      step_path: stepPathSchema,
    }),
  }),

  set_delay: tool({
    description: 'Set a delay (in minutes) before a step is sent.',
    inputSchema: z.object({
      step_path: stepPathSchema,
      delay_minutes: z.number().int().min(0).describe('Delay in minutes before sending'),
    }),
  }),

  update_flow_info: tool({
    description: 'Update the flow name and/or description.',
    inputSchema: z.object({
      name: z.string().optional().describe('New flow name'),
      description: z.string().optional().describe('New flow description'),
    }),
  }),

  set_fallback: tool({
    description: 'Set the fallback template that sends when the contact does not reply.',
    inputSchema: z.object({
      template_name: z.string().describe('Template to use for the nudge'),
      delay_minutes: z
        .number()
        .int()
        .min(1)
        .describe('Minutes to wait before sending the nudge'),
    }),
  }),

  focus_step: tool({
    description:
      'Focus on a specific step so the phone preview shows that step. Use this after making changes to let the user see the result.',
    inputSchema: z.object({
      step_path: stepPathSchema,
    }),
  }),
};
