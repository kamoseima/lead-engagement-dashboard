'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { formatWhatsAppText, replaceVariablesWithSamples } from '@/lib/whatsapp-format';
import type { FlowStep } from '@/types/database';
import type { Template } from '@/services/templates/template.service';

// ── Types ─────────────────────────────────────────────────

interface FlowPhonePreviewProps {
  steps: FlowStep[];
  templates: Template[];
  businessName?: string;
  className?: string;
}

/** A single message in the conversation timeline */
interface ConversationMessage {
  type: 'business' | 'user';
  body?: string;
  title?: string;
  mediaUrl?: string;
  footer?: string;
  buttons?: { text: string; type?: string }[];
  stepLabel?: string;
  /** Stable path key for this step (e.g. "0", "0/1/0") used for branch selection */
  pathKey?: string;
  /** Branch options available at this step */
  branchOptions?: { label: string; branchIndex: number }[];
}

// ── Helpers ───────────────────────────────────────────────

function findTemplate(templates: Template[], name?: string): Template | undefined {
  if (!name) return undefined;
  return templates.find((t) => t.name === name);
}

function formatBody(body?: string): string | null {
  if (!body) return null;
  return formatWhatsAppText(replaceVariablesWithSamples(body));
}

const timeOffset = (minutesAgo: number): string => {
  const d = new Date(Date.now() - minutesAgo * 60_000);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// ── Build conversation from flow steps ────────────────────

function buildConversation(
  steps: FlowStep[],
  templates: Template[],
  /** map of pathKey → chosen branchIndex */
  branchChoices: Record<string, number>,
  stepCounter: { n: number },
  parentPath: string
): ConversationMessage[] {
  const messages: ConversationMessage[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const pathKey = parentPath ? `${parentPath}/${i}` : `${i}`;
    const tpl = findTemplate(templates, step.template);
    const hasBranches = step.branches && step.branches.length > 0;

    stepCounter.n++;
    const stepNum = stepCounter.n;

    // Business sends this step's template
    messages.push({
      type: 'business',
      body: tpl?.body,
      title: tpl?.title,
      mediaUrl: tpl?.media_url,
      buttons: tpl?.buttons,
      stepLabel: step.label || step.template || `Step ${stepNum}`,
      pathKey,
      branchOptions: hasBranches
        ? step.branches!.map((b, bi) => ({ label: b.buttonLabel, branchIndex: bi }))
        : undefined,
    });

    // If this step has branches, show the user's chosen reply and recurse into that branch
    if (hasBranches) {
      const chosenIdx = branchChoices[pathKey] ?? 0;
      const chosen = step.branches![chosenIdx];

      if (chosen) {
        // User replies with the chosen button
        messages.push({
          type: 'user',
          body: chosen.buttonLabel,
        });

        // Recurse into the branch's sub-steps
        if (chosen.steps.length > 0) {
          const branchPath = `${pathKey}:${chosenIdx}`;
          const subMessages = buildConversation(
            chosen.steps,
            templates,
            branchChoices,
            stepCounter,
            branchPath
          );
          messages.push(...subMessages);
        }
      }
    }

    // Continue to the next sibling step (no early return)
  }

  return messages;
}

// ── Component ─────────────────────────────────────────────

export function FlowPhonePreview({
  steps,
  templates,
  businessName = 'Lead Engage',
  className,
}: FlowPhonePreviewProps) {
  // Track which branch the user has selected at each branching step (keyed by path)
  const [branchChoices, setBranchChoices] = useState<Record<string, number>>({});
  const chatRef = useRef<HTMLDivElement>(null);

  const conversation = useMemo(
    () => buildConversation(steps, templates, branchChoices, { n: 0 }, ''),
    [steps, templates, branchChoices]
  );

  // Auto-scroll to bottom when conversation changes
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [conversation]);

  const selectBranch = (pathKey: string, branchIndex: number) => {
    setBranchChoices((prev) => ({ ...prev, [pathKey]: branchIndex }));
  };

  return (
    <div className={className}>
      <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
        Flow Preview
      </p>

      {/* Phone Shell */}
      <div className="mx-auto w-[320px] rounded-[32px] border-[3px] border-[#1A2130] bg-[#111B21] p-3 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {/* Notch */}
        <div className="mx-auto mb-2 h-1.5 w-20 rounded bg-[#1A2130]" />

        {/* Screen */}
        <div className="overflow-hidden rounded-[20px] bg-[#0B141A]">
          {/* WA Header */}
          <div className="flex items-center gap-2.5 bg-[#1F2C34] px-3.5 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#25D366]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[#E9EDEF]">
                {businessName}
              </div>
              <div className="text-[10px] text-[#8696A0]">Business Account</div>
            </div>
          </div>

          {/* Chat Area */}
          <div
            ref={chatRef}
            className="max-h-[400px] min-h-[280px] space-y-2.5 overflow-y-auto p-3 scroll-smooth"
          >
            {conversation.length === 0 && (
              <div className="flex h-[260px] flex-col items-center justify-center gap-1 text-[11px] text-[#8696A0]">
                <span className="text-[28px]">💬</span>
                <span>Add steps to see the flow</span>
              </div>
            )}

            {conversation.map((msg, msgIdx) => {
              const minutesAgo = (conversation.length - msgIdx) * 3;
              const time = timeOffset(minutesAgo);

              if (msg.type === 'user') {
                return (
                  <div key={msgIdx} className="flex justify-end">
                    <div className="max-w-[200px] rounded-[8px_0_8px_8px] bg-[#005C4B] px-2.5 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                      <div className="text-[12px] leading-[1.55] text-[#E9EDEF]">
                        {msg.body}
                      </div>
                      <div className="mt-0.5 text-right text-[9px] text-[#8696A0]">
                        {time}
                      </div>
                    </div>
                  </div>
                );
              }

              // Business message
              const formattedBody = formatBody(msg.body);
              const formattedTitle = msg.title ? formatBody(msg.title) : null;
              const chosenBranchIdx = msg.pathKey != null ? (branchChoices[msg.pathKey] ?? 0) : 0;

              return (
                <div key={msgIdx}>
                  {/* Step label chip */}
                  <div className="mb-1 text-center">
                    <span className="inline-block rounded-full bg-[#1F2C34] px-2 py-0.5 text-[9px] text-[#8696A0]">
                      {msg.stepLabel}
                    </span>
                  </div>

                  {/* Bubble */}
                  <div className="max-w-[240px] overflow-hidden rounded-[0_8px_8px_8px] bg-[#1F2C34] shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
                    {/* Media */}
                    {msg.mediaUrl && (
                      <div className="h-[100px] w-full overflow-hidden bg-[#0B141A]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={msg.mediaUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Title */}
                    {formattedTitle && (
                      <div
                        className="px-2 pt-1.5 text-[11px] font-bold text-[#E9EDEF]"
                        dangerouslySetInnerHTML={{ __html: formattedTitle }}
                      />
                    )}

                    {/* Body */}
                    <div
                      className="whitespace-pre-wrap break-words px-2 py-1.5 text-[11px] leading-[1.5] text-[#E9EDEF]"
                      dangerouslySetInnerHTML={{
                        __html: formattedBody || '<span style="color:#8696A0">No template selected</span>',
                      }}
                    />

                    {/* Timestamp */}
                    <div className="px-2 pb-1 text-right text-[8px] text-[#8696A0]">
                      {time}
                    </div>

                    {/* Interactive buttons — clicking selects that branch path */}
                    {msg.buttons && msg.buttons.length > 0 && (
                      <div className="border-t border-white/[0.06]">
                        {msg.buttons.map((btn, bIdx) => {
                          const isSelected = msg.branchOptions
                            ? chosenBranchIdx === bIdx
                            : false;

                          return (
                            <button
                              key={bIdx}
                              type="button"
                              onClick={() => {
                                if (msg.branchOptions && msg.pathKey != null) {
                                  selectBranch(msg.pathKey, bIdx);
                                }
                              }}
                              className={`block w-full py-2 text-center text-[11px] font-medium transition-colors ${
                                bIdx > 0 ? 'border-t border-white/[0.06]' : ''
                              } ${
                                isSelected
                                  ? 'bg-[#53BDEB]/20 text-[#53BDEB]'
                                  : msg.branchOptions
                                    ? 'text-[#53BDEB]/70 hover:bg-white/[0.03] hover:text-[#53BDEB] cursor-pointer'
                                    : 'text-[#53BDEB]/70'
                              }`}
                            >
                              {btn.type === 'PHONE_NUMBER' && '📞 '}
                              {btn.text || `Button ${bIdx + 1}`}
                              {btn.type === 'URL' && ' ↗'}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Branch options without template buttons (body-option / custom branches) */}
                    {msg.branchOptions && (!msg.buttons || msg.buttons.length === 0) && (
                      <div className="border-t border-white/[0.06] px-2 py-1.5">
                        <div className="mb-1 text-[9px] text-[#8696A0]">Choose a path:</div>
                        <div className="flex flex-wrap gap-1">
                          {msg.branchOptions.map((opt) => {
                            const isSelected = chosenBranchIdx === opt.branchIndex;

                            return (
                              <button
                                key={opt.branchIndex}
                                type="button"
                                onClick={() => {
                                  if (msg.pathKey != null) {
                                    selectBranch(msg.pathKey, opt.branchIndex);
                                  }
                                }}
                                className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                                  isSelected
                                    ? 'bg-[#53BDEB]/20 text-[#53BDEB]'
                                    : 'bg-white/[0.06] text-[#8696A0] hover:text-[#53BDEB]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* End of flow indicator */}
            {conversation.length > 0 && (
              <div className="pt-1 text-center">
                <span className="inline-block rounded-full bg-[#1F2C34]/60 px-2.5 py-0.5 text-[9px] text-[#8696A0]">
                  End of flow
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Home Indicator */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-sm bg-white/[0.15]" />
      </div>
    </div>
  );
}
