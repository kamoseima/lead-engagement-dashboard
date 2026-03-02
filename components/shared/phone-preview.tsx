'use client';

import { useMemo } from 'react';
import { formatWhatsAppText, replaceVariablesWithSamples } from '@/lib/whatsapp-format';

interface PhonePreviewButton {
  text: string;
  type?: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
}

interface PhonePreviewProps {
  body?: string;
  title?: string;
  footer?: string;
  mediaUrl?: string;
  buttons?: PhonePreviewButton[];
  templateType?: string;
  businessName?: string;
  variableNames?: Record<string, string>;
  className?: string;
}

export function PhonePreview({
  body,
  title,
  footer,
  mediaUrl,
  buttons,
  businessName = 'Lead Engage',
  variableNames,
  className,
}: PhonePreviewProps) {
  const formattedBody = useMemo(() => {
    if (!body) return null;
    const withSamples = replaceVariablesWithSamples(body, variableNames);
    return formatWhatsAppText(withSamples);
  }, [body, variableNames]);

  const formattedTitle = useMemo(() => {
    if (!title) return null;
    const withSamples = replaceVariablesWithSamples(title, variableNames);
    return formatWhatsAppText(withSamples);
  }, [title, variableNames]);

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-ZA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return (
    <div className={className}>
      <p className="mb-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
        Live Preview
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
          <div className="min-h-[280px] p-3.5">
            {/* Message Bubble */}
            <div className="max-w-[260px] overflow-hidden rounded-[0_8px_8px_8px] bg-[#1F2C34] shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
              {/* Media */}
              {mediaUrl && (
                <div className="h-[140px] w-full overflow-hidden bg-[#0B141A]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl}
                    alt="Media preview"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              {/* Media Placeholder (when no URL but media type) */}
              {!mediaUrl && !body && !title && (
                <div className="flex min-h-[100px] flex-col items-center justify-center gap-1 bg-[#1a2530] text-[11px] text-[#8696A0]">
                  <span className="text-[28px]">💬</span>
                  <span>Your message preview</span>
                </div>
              )}

              {/* Title */}
              {formattedTitle && (
                <div
                  className="px-2.5 pt-2 text-[13px] font-bold text-[#E9EDEF]"
                  dangerouslySetInnerHTML={{ __html: formattedTitle }}
                />
              )}

              {/* Body */}
              <div
                className="whitespace-pre-wrap break-words px-2.5 py-2 text-[12px] leading-[1.55] text-[#E9EDEF]"
                dangerouslySetInnerHTML={{
                  __html: formattedBody || 'Your message will appear here...',
                }}
              />

              {/* Footer */}
              {footer && (
                <div className="px-2.5 pb-1 text-[10px] text-[#8696A0]">
                  {footer}
                </div>
              )}

              {/* Timestamp */}
              <div className="px-2.5 pb-1.5 text-right text-[9px] text-[#8696A0]">
                {timeStr}
              </div>

              {/* Buttons */}
              {buttons && buttons.length > 0 && (
                <div className="border-t border-white/[0.06]">
                  {buttons.map((btn, i) => (
                    <div
                      key={i}
                      className={`py-2.5 text-center text-[12px] font-medium text-[#53BDEB] ${
                        i > 0 ? 'border-t border-white/[0.06]' : ''
                      }`}
                    >
                      {btn.type === 'PHONE_NUMBER' && '📞 '}
                      {btn.text || `Button ${i + 1}`}
                      {btn.type === 'URL' && ' ↗'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Home Indicator */}
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-sm bg-white/[0.15]" />
      </div>
    </div>
  );
}
