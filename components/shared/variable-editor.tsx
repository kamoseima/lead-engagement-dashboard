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
  /** Friendly names from the template definition (e.g. ["firstName", "price"]) */
  friendlyNames?: string[];
}

export function VariableEditor({
  bodyText,
  titleText,
  variableNames,
  onChange,
  friendlyNames = [],
}: VariableEditorProps) {
  const variables = useMemo(() => {
    const combined = [bodyText, titleText || ''].join(' ');
    return extractVariables(combined);
  }, [bodyText, titleText]);

  if (variables.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
          Variable Values
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          These values are sent to all recipients. Leave blank to use template defaults.
        </p>
      </div>
      {variables.map((num) => {
        const friendlyName = friendlyNames[num - 1];
        return (
          <div key={num} className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] font-semibold text-primary">
                {`{{${num}}}`}
              </span>
              {friendlyName && (
                <span className="text-[11px] text-muted-foreground">— {friendlyName}</span>
              )}
            </div>
            <Input
              placeholder={friendlyName ? `Enter ${friendlyName}…` : `Value for {{${num}}}`}
              value={variableNames[String(num)] || ''}
              onChange={(e) =>
                onChange({ ...variableNames, [String(num)]: e.target.value })
              }
              className="h-8 text-xs"
            />
          </div>
        );
      })}
    </div>
  );
}
