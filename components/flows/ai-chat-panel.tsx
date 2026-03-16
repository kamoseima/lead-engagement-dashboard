'use client';

import { useRef, useEffect, useState, useMemo, FormEvent } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { Bot, Send, X, Loader2, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useFlowEditorStore } from '@/lib/stores/flow-editor-store';
import { parseStepPath } from '@/lib/ai/flow-tools';

export function AiChatPanel() {
  const {
    flow,
    templates,
    selectedPath,
    setAiPanelOpen,
    setTemplateForStep,
    addBranchStep,
    addRootStep,
    removeStep,
    updateStep,
    updateFlow,
    updateFallback,
    selectStep,
  } = useFlowEditorStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/v1/flows/${flow?.id}/chat`,
        body: {
          flow,
          templates,
          selectedPath,
        },
      }),
    [flow, templates, selectedPath]
  );

  const { messages, sendMessage, status } = useChat({
    transport,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onToolCall: (async ({ toolCall }: { toolCall: any }) => {
      const toolName = toolCall.toolName as string;
      const input = toolCall.input ?? toolCall.args ?? {};

      switch (toolName) {
        case 'set_template': {
          const { step_path, template_name } = input as {
            step_path: string;
            template_name: string;
          };
          setTemplateForStep(parseStepPath(step_path), template_name);
          return `Set template "${template_name}" on step ${step_path}`;
        }

        case 'add_step': {
          const { template_name } = input as { template_name: string };
          addRootStep();
          const currentFlow = useFlowEditorStore.getState().flow;
          if (currentFlow) {
            const newPath = [currentFlow.steps.length - 1];
            setTemplateForStep(newPath, template_name);
          }
          return `Added new step with template "${template_name}"`;
        }

        case 'add_branch_step': {
          const { parent_step_path, branch_index, template_name } = input as {
            parent_step_path: string;
            branch_index: number;
            template_name: string;
          };
          addBranchStep(parseStepPath(parent_step_path), branch_index, template_name);
          return `Added branch step with template "${template_name}" on branch ${branch_index} of step ${parent_step_path}`;
        }

        case 'remove_step': {
          const { step_path } = input as { step_path: string };
          removeStep(parseStepPath(step_path));
          return `Removed step at path ${step_path}`;
        }

        case 'set_delay': {
          const { step_path, delay_minutes } = input as {
            step_path: string;
            delay_minutes: number;
          };
          updateStep(parseStepPath(step_path), { delayMinutes: delay_minutes });
          return `Set ${delay_minutes} minute delay on step ${step_path}`;
        }

        case 'update_flow_info': {
          const { name, description } = input as {
            name?: string;
            description?: string;
          };
          updateFlow({
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
          });
          return `Updated flow info${name ? `: name="${name}"` : ''}${description ? `: description="${description}"` : ''}`;
        }

        case 'set_fallback': {
          const { template_name, delay_minutes } = input as {
            template_name: string;
            delay_minutes: number;
          };
          updateFallback({
            template: template_name,
            delayMinutes: delay_minutes,
          });
          return `Set fallback to "${template_name}" after ${delay_minutes} minutes`;
        }

        case 'focus_step': {
          const { step_path } = input as { step_path: string };
          selectStep(parseStepPath(step_path));
          return `Focused on step ${step_path}`;
        }

        default:
          return `Unknown tool: ${toolName}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any,
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">AI Flow Builder</span>
        </div>
        <button
          type="button"
          onClick={() => setAiPanelOpen(false)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Bot className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Tell me how to build your flow.
            </p>
            <div className="space-y-1 text-[11px] text-muted-foreground/60">
              <p>&quot;Add the welcome_text template as step 1&quot;</p>
              <p>&quot;When &apos;Yes show me plans&apos; is clicked, send the plans template&quot;</p>
              <p>&quot;Set a 5 minute delay on step 2&quot;</p>
            </div>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === 'system') return null;

          const isUser = msg.role === 'user';
          const hasToolCalls =
            msg.role === 'assistant' &&
            msg.parts?.some((p) => p.type.startsWith('tool-'));

          return (
            <div
              key={msg.id}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {/* Render text parts */}
                {msg.parts
                  ?.filter((p) => p.type === 'text' && p.text.trim())
                  .map((p, i) => (
                    <p key={i}>{p.type === 'text' ? p.text : ''}</p>
                  ))}

                {/* Render tool invocation indicators */}
                {hasToolCalls &&
                  msg.parts
                    ?.filter((p) => p.type.startsWith('tool-'))
                    .map((p, i) => {
                      // In AI SDK v6, tool parts have type like "tool-{name}" with state/toolCallId directly
                      const toolPart = p as { type: string; toolCallId: string; state: string };
                      const toolName = toolPart.type.replace('tool-', '').replace(/_/g, ' ');
                      return (
                        <div
                          key={i}
                          className="mt-1 flex items-center gap-1.5 rounded bg-background/50 px-2 py-1 text-[10px] text-muted-foreground"
                        >
                          <Wrench className="h-3 w-3" />
                          <span>{toolName || 'tool call'}</span>
                          {toolPart.state === 'result' && (
                            <span className="text-green-500">done</span>
                          )}
                        </div>
                      );
                    })}

                {/* Fallback when no text parts found */}
                {msg.parts?.filter((p) => p.type === 'text').length === 0 &&
                  !hasToolCalls && (
                    <p className="text-muted-foreground italic">...</p>
                  )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. When 'Yes' is clicked, send welcome_text..."
          className="h-8 flex-1 text-xs"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
