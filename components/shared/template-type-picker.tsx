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

type TemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

interface TemplateTypeOption {
  value: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Which categories this type is available under. Omit for in-session types. */
  categories?: TemplateCategory[];
}

const TEMPLATE_TYPES: TemplateTypeOption[] = [
  {
    value: 'text',
    label: 'Text',
    description: 'Plain text body. No buttons.',
    icon: MessageSquare,
    categories: ['MARKETING', 'UTILITY'],
  },
  {
    value: 'quick-reply',
    label: 'Quick Reply',
    description: 'Body + up to 10 reply buttons.',
    icon: Reply,
    categories: ['MARKETING', 'UTILITY'],
  },
  {
    value: 'call-to-action',
    label: 'Call to Action',
    description: 'Body with URL or phone buttons.',
    icon: Phone,
    categories: ['MARKETING', 'UTILITY'],
  },
  {
    value: 'card',
    label: 'Card',
    description: 'Title, body, media, action buttons.',
    icon: CreditCard,
    categories: ['MARKETING', 'UTILITY'],
  },
  {
    value: 'media',
    label: 'Media',
    description: 'Image, video, or document with caption.',
    icon: Image,
    categories: ['MARKETING', 'UTILITY'],
  },
  {
    value: 'carousel',
    label: 'Carousel',
    description: 'Multiple swipeable cards.',
    icon: Layers,
    categories: ['MARKETING'],
  },
  {
    value: 'list-picker',
    label: 'List Picker',
    description: 'In-session only. Opens selectable menu.',
    icon: List,
    // No categories — in-session only, not submitted for approval
  },
  {
    value: 'authentication',
    label: 'Authentication',
    description: 'OTP with Copy Code button.',
    icon: Lock,
    categories: ['AUTHENTICATION'],
  },
  {
    value: 'catalog',
    label: 'Catalog',
    description: 'Product catalog. Requires Catalog ID.',
    icon: ShoppingCart,
    categories: ['MARKETING'],
  },
];

interface TemplateTypePickerProps {
  value: string;
  onChange: (type: string) => void;
  /** Filter types by category. Types without a matching category are shown greyed out. */
  category?: TemplateCategory;
}

export function TemplateTypePicker({ value, onChange, category }: TemplateTypePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {TEMPLATE_TYPES.map((type) => {
        const Icon = type.icon;
        const isActive = value === type.value;
        // A type is available if no category filter is set, or if the type's categories
        // include the selected category, or if the type has no categories (in-session).
        const isAvailable = !category || !type.categories || type.categories.includes(category);
        return (
          <button
            key={type.value}
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && onChange(type.value)}
            className={`flex flex-col items-start gap-1.5 rounded-lg border p-3 text-left transition-colors ${
              isActive
                ? 'border-primary bg-primary/10'
                : isAvailable
                  ? 'border-border hover:border-primary/30 hover:bg-card'
                  : 'border-border opacity-30 cursor-not-allowed'
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
