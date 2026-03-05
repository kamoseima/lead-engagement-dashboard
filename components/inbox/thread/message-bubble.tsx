'use client';

import { cn } from '@/lib/utils';
import { ChannelBadge } from '../shared/channel-badge';
import { Check, CheckCheck } from 'lucide-react';
import type { TimelineMessage } from '@/types/inbox';

interface MessageBubbleProps {
  message: TimelineMessage;
}

function isInbound(msg: TimelineMessage): boolean {
  const author = msg.author?.trim();
  if (!author) return true;
  // Phone number, whatsapp: prefix, or email → contact (inbound)
  if (author.startsWith('+') || author.startsWith('whatsapp:') || author.includes('@')) return true;
  // Explicit "contact" label from fallback timeline
  if (author === 'contact') return true;
  // Known outbound authors: agent names, system, etc.
  return false;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function MessageStatus({ status }: { status: string | null }) {
  if (!status) return null;

  switch (status) {
    case 'sent':
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case 'delivered':
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case 'read':
      return <CheckCheck className="h-3 w-3 text-primary" />;
    case 'failed':
      return <span className="text-[10px] text-destructive">Failed</span>;
    default:
      return null;
  }
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const inbound = isInbound(message);

  return (
    <div className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-3.5 py-2',
          inbound
            ? 'rounded-bl-md bg-muted text-foreground'
            : 'rounded-br-md bg-primary/15 text-foreground'
        )}
      >
        {/* Media attachments */}
        {message.media && message.media.length > 0 && (
          <div className="mb-1.5 space-y-1">
            {message.media.map((m) => {
              if (m.contentType?.startsWith('image/')) {
                return (
                  <div key={m.sid} className="overflow-hidden rounded-lg">
                    <div className="flex h-32 items-center justify-center bg-muted/50 text-xs text-muted-foreground">
                      Image: {m.filename}
                    </div>
                  </div>
                );
              }
              return (
                <div key={m.sid} className="flex items-center gap-2 rounded-lg bg-background/50 px-2.5 py-1.5 text-xs">
                  <span className="truncate">{m.filename}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {m.size ? `${Math.round(m.size / 1024)}KB` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Message body */}
        {message.body_preview && (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {message.body_preview}
          </p>
        )}

        {/* Footer: channel, time, status */}
        <div className={cn(
          'mt-1 flex items-center gap-1.5',
          inbound ? 'justify-start' : 'justify-end'
        )}>
          <ChannelBadge channel={message.channel} size="sm" />
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.date_created || message.created_at)}
          </span>
          {!inbound && <MessageStatus status={message.status} />}
        </div>
      </div>
    </div>
  );
}
