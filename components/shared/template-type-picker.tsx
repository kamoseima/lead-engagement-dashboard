'use client';

import {
  MessageSquare,
  Reply,
  Phone,
  CreditCard,
  Image,
  Layers,
  List,
  Lock,
  ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TemplateTypeOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const TEMPLATE_TYPES: TemplateTypeOption[] = [
  {
    value: 'text',
    label: 'Text',
    description: 'Plain text body. No buttons.',
    icon: MessageSquare,
  },
  {
    value: 'quick-reply',
    label: 'Quick Reply',
    description: 'Body + up to 3 reply buttons.',
    icon: Reply,
  },
  {
    value: 'call-to-action',
    label: 'Call to Action',
    description: 'Body with URL or phone buttons.',
    icon: Phone,
  },
  {
    value: 'card',
    label: 'Card',
    description: 'Title, body, media, action buttons.',
    icon: CreditCard,
  },
  {
    value: 'media',
    label: 'Media',
    description: 'Image, video, or document with caption.',
    icon: Image,
  },
  {
    value: 'carousel',
    label: 'Carousel',
    description: 'Multiple swipeable cards.',
    icon: Layers,
  },
  {
    value: 'list-picker',
    label: 'List Picker',
    description: 'Body + button that opens selectable menu.',
    icon: List,
  },
  {
    value: 'authentication',
    label: 'Authentication',
    description: 'OTP / verification code.',
    icon: Lock,
  },
  {
    value: 'catalog',
    label: 'Catalog',
    description: 'Product catalog message.',
    icon: ShoppingCart,
  },
];

interface TemplateTypePickerProps {
  value: string;
  onChange: (type: string) => void;
}

export function TemplateTypePicker({ value, onChange }: TemplateTypePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TEMPLATE_TYPES.map((type) => {
        const Icon = type.icon;
        const isActive = value === type.value;
        return (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange(type.value)}
            className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
              isActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/30 hover:bg-card'
            }`}
          >
            <Icon
              className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <span className={`text-xs font-medium ${isActive ? 'text-primary' : ''}`}>
              {type.label}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {type.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { TEMPLATE_TYPES };
