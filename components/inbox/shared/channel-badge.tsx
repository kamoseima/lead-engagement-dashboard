'use client';

import { MessageSquare, Mail, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChannelType } from '@/types/inbox';

const channelConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', className: 'text-[hsl(var(--channel-whatsapp))] bg-[hsl(var(--channel-whatsapp)/0.12)]' },
  sms: { icon: MessageSquare, label: 'SMS', className: 'text-[hsl(var(--channel-sms))] bg-[hsl(var(--channel-sms)/0.12)]' },
  email: { icon: Mail, label: 'Email', className: 'text-[hsl(var(--channel-email))] bg-[hsl(var(--channel-email)/0.12)]' },
  voice: { icon: Phone, label: 'Voice', className: 'text-[hsl(var(--channel-voice))] bg-[hsl(var(--channel-voice)/0.12)]' },
};

interface ChannelBadgeProps {
  channel: ChannelType | string | null;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ChannelBadge({ channel, showLabel = false, size = 'sm' }: ChannelBadgeProps) {
  const config = channelConfig[channel || ''] || channelConfig.sms;
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className
      )}
      title={config.label}
    >
      <Icon className={iconSize} />
      {showLabel && config.label}
    </span>
  );
}
