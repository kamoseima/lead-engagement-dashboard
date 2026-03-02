'use client';

import type { LucideIcon } from 'lucide-react';
import { Check } from 'lucide-react';

interface ModeOption {
  value: string;
  label: string;
  hint: string;
  icon: LucideIcon;
}

interface ModeToggleProps {
  options: ModeOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ModeToggle({ options, value, onChange }: ModeToggleProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors ${
              isActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/30'
            }`}
          >
            {isActive && (
              <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                <Check className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
            <Icon
              className={`h-4 w-4 ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            />
            <span
              className={`text-xs font-medium ${
                isActive ? 'text-primary' : ''
              }`}
            >
              {opt.label}
            </span>
            <span className="text-[10px] leading-tight text-muted-foreground">
              {opt.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type { ModeOption };
