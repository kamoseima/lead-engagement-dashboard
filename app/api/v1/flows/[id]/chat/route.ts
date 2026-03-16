/**
 * POST /api/v1/flows/:id/chat — AI flow builder chat endpoint
 *
 * Streams an LLM response with tool calls that the client executes
 * to mutate the flow editor's Zustand store.
 *
 * Includes a server-side pre-check that catches invalid requests
 * (e.g. branching from NO_BUTTONS templates) before hitting the LLM.
 */

import { streamText, convertToModelMessages, type UIMessage } from 'ai';
import { groq } from '@ai-sdk/groq';
import { flowTools } from '@/lib/ai/flow-tools';
import { buildSystemPrompt } from '@/lib/ai/flow-system-prompt';
import type { Flow } from '@/types/database';
import type { Template } from '@/services/templates/template.service';
import type { StepPath } from '@/lib/stores/flow-editor-store';

export const maxDuration = 30;

/**
 * Pre-check: if the user mentions branching/buttons AND references a
 * NO_BUTTONS template, return a helpful message without calling the LLM.
 */
function preCheck(
  userMessage: string,
  templates: Template[]
): string | null {
  const msg = userMessage.toLowerCase();

  // Detect branching intent
  const branchingKeywords = [
    'button', 'buttons', 'clicked', 'click', 'branch', 'branches',
    'when', 'for each', 'each of', 'response',
  ];
  const wantsBranching = branchingKeywords.some((kw) => msg.includes(kw));
  if (!wantsBranching) return null;

  // Find which templates the user references
  const noButtonTemplates: string[] = [];
  const withButtonTemplates: string[] = [];

  for (const t of templates) {
    const hasButtons = t.buttons && t.buttons.length > 0;
    // Check if user mentions this template (fuzzy match)
    const nameVariants = [
      t.name.toLowerCase(),
      t.name.replace(/^fc_/, '').replace(/_/g, ' ').toLowerCase(),
      t.name.replace(/^fc_/, '').toLowerCase(),
    ];
    const mentioned = nameVariants.some((v) => msg.includes(v));

    if (mentioned && !hasButtons) {
      noButtonTemplates.push(t.name);
    }
    if (hasButtons) {
      const buttons = t.buttons!.map((b) => `"${b.text}"`).join(', ');
      withButtonTemplates.push(`- **${t.name}** (buttons: ${buttons})`);
    }
  }

  // If the user wants branching FROM a no-button template, intercept
  // But only if the no-button template is the one they want to branch FROM,
  // not one they want to add AS a sub-step
  if (noButtonTemplates.length > 0) {
    // Check if the no-button template is the "starting" template (to branch from)
    // Heuristic: if msg structure is like "start with X... then for each button..."
    // the X template is the one being branched from
    const startKeywords = ['start with', 'begin with', 'use', 'starts with', 'create a flow'];
    const isStartTemplate = startKeywords.some((kw) => {
      const idx = msg.indexOf(kw);
      if (idx === -1) return false;
      const after = msg.slice(idx, idx + 80);
      return noButtonTemplates.some((t) => {
        const nameVariants = [
          t.toLowerCase(),
          t.replace(/^fc_/, '').replace(/_/g, ' ').toLowerCase(),
        ];
        return nameVariants.some((v) => after.includes(v));
      });
    });

    if (isStartTemplate) {
      const names = noButtonTemplates.map((n) => `"${n}"`).join(', ');
      return [
        `The ${names} template has no buttons, so it can't support branching or button responses.`,
        '',
        'These templates have buttons you can branch from:',
        ...withButtonTemplates,
        '',
        'Which template would you like to use as the starting step?',
      ].join('\n');
    }
  }

  return null;
}

export async function POST(request: Request) {
  const body = await request.json();
  const { messages, flow, templates, selectedPath } = body as {
    messages: UIMessage[];
    flow: Flow;
    templates: Template[];
    selectedPath: StepPath | null;
  };

  if (!process.env.GROQ_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GROQ_API_KEY not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Pre-check: intercept invalid requests before calling LLM
  const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
  if (lastUserMsg) {
    const textContent =
      lastUserMsg.parts
        ?.filter((p) => p.type === 'text')
        .map((p) => (p as { type: 'text'; text: string }).text)
        .join(' ') || '';

    const rejection = preCheck(textContent, templates);
    if (rejection) {
      // Return a text-only response without calling the LLM
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          // AI SDK UI message stream format: text part
          controller.enqueue(encoder.encode(`0:${JSON.stringify(rejection)}\n`));
          // Finish reason
          controller.enqueue(
            encoder.encode(`d:${JSON.stringify({ finishReason: 'stop', usage: { promptTokens: 0, completionTokens: 0 } })}\n`)
          );
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
  }

  const systemPrompt = buildSystemPrompt(flow, templates, selectedPath);

  // Strip tool-call parts from message history to prevent AI_MissingToolResultsError.
  // The system prompt already contains the current flow state, so the model
  // doesn't need tool call history to understand what happened.
  const cleanMessages: UIMessage[] = messages
    .map((msg) => {
      if (msg.role !== 'assistant' || !msg.parts) return msg;
      const textParts = msg.parts.filter((p) => p.type === 'text');
      if (textParts.length === 0) return null; // Drop tool-only messages
      return { ...msg, parts: textParts };
    })
    .filter((msg): msg is UIMessage => msg !== null);

  try {
    const result = streamText({
      model: groq('meta-llama/llama-4-scout-17b-16e-instruct'),
      system: systemPrompt,
      messages: await convertToModelMessages(cleanMessages),
      tools: flowTools,
      onError: (event) => {
        console.error('[AI Chat] stream error:', JSON.stringify(event.error, null, 2));
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error('[AI Chat] streamText error:', err);
    return new Response(
      JSON.stringify({ error: 'AI request failed. Check server logs.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
