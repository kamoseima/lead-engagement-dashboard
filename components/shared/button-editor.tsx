'use client';

import { Plus, X, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { TemplateButton } from '@/services/templates/template.service';

type ButtonType = TemplateButton['type'];

/** Shortened URL domains that Meta always rejects */
const SHORTENED_URL_DOMAINS = ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'short.io'];

function isShortenedUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return SHORTENED_URL_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

function hasVariableNotAtEnd(url: string): boolean {
  const varPattern = /\{\{\d+\}\}/g;
  const matches = [...url.matchAll(varPattern)];
  if (matches.length === 0) return false;
  const lastMatch = matches[matches.length - 1];
  const afterLast = url.substring(lastMatch.index! + lastMatch[0].length);
  if (afterLast.trim().length > 0) return true;
  if (matches.length > 1) return true;
  return false;
}

const ALL_TYPES: { value: ButtonType; label: string }[] = [
  { value: 'QUICK_REPLY', label: 'Reply' },
  { value: 'URL', label: 'URL' },
  { value: 'PHONE_NUMBER', label: 'Phone' },
  { value: 'COPY_CODE', label: 'Copy Code' },
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

          <div className="flex flex-1 flex-col gap-0.5">
            <Input
              placeholder={btn.type === 'COPY_CODE' ? 'e.g. Copy Code' : 'Button text'}
              value={btn.text}
              onChange={(e) => updateButton(i, { text: e.target.value })}
              className="h-8 text-xs"
              maxLength={25}
            />
            <span className="text-right text-[9px] text-muted-foreground">
              {btn.text.length}/25
            </span>
          </div>

          {btn.type === 'URL' && (
            <div className="flex flex-1 flex-col gap-0.5">
              <Input
                placeholder="https://example.com/page/{{1}}"
                value={btn.url || ''}
                onChange={(e) => updateButton(i, { url: e.target.value })}
                className="h-8 text-xs"
              />
              {btn.url && isShortenedUrl(btn.url) && (
                <p className="flex items-center gap-1 text-[9px] text-destructive">
                  <AlertTriangle className="h-3 w-3" /> Shortened URLs are always rejected by Meta.
                </p>
              )}
              {btn.url && hasVariableNotAtEnd(btn.url) && (
                <p className="flex items-center gap-1 text-[9px] text-destructive">
                  <AlertTriangle className="h-3 w-3" /> URL variables {'{{1}}'} must be at the end of the URL only.
                </p>
              )}
            </div>
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
