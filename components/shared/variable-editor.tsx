'use client';

import { useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { extractVariables } from '@/lib/whatsapp-format';

interface VariableEditorProps {
  /** Body and/or title text to scan for {{N}} placeholders. */
  bodyText: string;
  titleText?: string;
  /** Map of variable number (as string) to descriptive name. */
  variableNames: Record<string, string>;
  onChange: (names: Record<string, string>) => void;
}

export function VariableEditor({
  bodyText,
  titleText,
  variableNames,
  onChange,
}: VariableEditorProps) {
  const variables = useMemo(() => {
    const combined = [bodyText, titleText || ''].join(' ');
    return extractVariables(combined);
  }, [bodyText, titleText]);

  if (variables.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
        Variables detected
      </p>
      {variables.map((num) => (
        <div key={num} className="flex items-center gap-2">
          <span className="flex h-7 shrink-0 items-center rounded bg-primary/10 px-2 font-mono text-[11px] font-semibold text-primary">
            {`{{${num}}}`}
          </span>
          <Input
            placeholder={`e.g. customer_name`}
            value={variableNames[String(num)] || ''}
            onChange={(e) =>
              onChange({ ...variableNames, [String(num)]: e.target.value })
            }
            className="h-7 text-xs"
          />
        </div>
      ))}
    </div>
  );
}
