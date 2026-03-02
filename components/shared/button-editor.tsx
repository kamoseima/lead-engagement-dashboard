'use client';

import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { TemplateButton } from '@/services/templates/template.service';

type ButtonType = TemplateButton['type'];

const ALL_TYPES: { value: ButtonType; label: string }[] = [
  { value: 'QUICK_REPLY', label: 'Reply' },
  { value: 'URL', label: 'URL' },
  { value: 'PHONE_NUMBER', label: 'Phone' },
];

interface ButtonEditorProps {
  buttons: TemplateButton[];
  onChange: (buttons: TemplateButton[]) => void;
  maxButtons?: number;
  /** Restrict which button types can be selected. Defaults to all. */
  allowedTypes?: ButtonType[];
}

export function ButtonEditor({
  buttons,
  onChange,
  maxButtons = 3,
  allowedTypes,
}: ButtonEditorProps) {
  const types = allowedTypes
    ? ALL_TYPES.filter((t) => allowedTypes.includes(t.value))
    : ALL_TYPES;

  const defaultType = types[0]?.value || 'QUICK_REPLY';

  const addButton = () => {
    if (buttons.length >= maxButtons) return;
    onChange([...buttons, { type: defaultType, text: '' }]);
  };

  const removeButton = (index: number) => {
    onChange(buttons.filter((_, i) => i !== index));
  };

  const updateButton = (index: number, updates: Partial<TemplateButton>) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {buttons.map((btn, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background p-2.5">
          {/* Type selector — hide if only one type allowed */}
          {types.length > 1 ? (
            <select
              value={btn.type}
              onChange={(e) =>
                updateButton(i, { type: e.target.value as ButtonType })
              }
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <span className="flex h-8 shrink-0 items-center rounded-md bg-muted px-2.5 text-[10px] font-medium text-muted-foreground">
              {types[0]?.label}
            </span>
          )}

          <Input
            placeholder="Button text"
            value={btn.text}
            onChange={(e) => updateButton(i, { text: e.target.value })}
            className="h-8 flex-1 text-xs"
          />

          {btn.type === 'URL' && (
            <Input
              placeholder="https://..."
              value={btn.url || ''}
              onChange={(e) => updateButton(i, { url: e.target.value })}
              className="h-8 flex-1 text-xs"
            />
          )}

          {btn.type === 'PHONE_NUMBER' && (
            <Input
              placeholder="+27..."
              value={btn.phone || ''}
              onChange={(e) => updateButton(i, { phone: e.target.value })}
              className="h-8 flex-1 text-xs"
            />
          )}

          <button
            type="button"
            onClick={() => removeButton(i)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {buttons.length < maxButtons && (
        <button
          type="button"
          onClick={addButton}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          Add Button
        </button>
      )}
    </div>
  );
}
