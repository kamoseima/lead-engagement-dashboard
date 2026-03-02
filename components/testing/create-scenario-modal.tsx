'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, GitBranch, Search } from 'lucide-react';
import type { Template } from '@/services/templates/template.service';
import type { Flow } from '@/types/database';

interface CreateScenarioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates: Template[];
  flows: Flow[];
  onCreated: () => void;
}

type ScenarioType = 'template' | 'flow';

export function CreateScenarioModal({
  open,
  onOpenChange,
  templates,
  flows,
  onCreated,
}: CreateScenarioModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<ScenarioType>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const approvedTemplates = templates.filter(t => t.status === 'approved');
  const filteredTemplates = approvedTemplates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );
  const filteredFlows = flows.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const canSubmit =
    name.trim() &&
    (type === 'template' ? selectedTemplate : selectedFlowId);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        description: description.trim() || undefined,
      };

      if (type === 'template') {
        body.template_name = selectedTemplate;
      } else {
        body.flow_id = selectedFlowId;
      }

      const res = await fetch('/api/v1/tests/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (json.success) {
        resetForm();
        onOpenChange(false);
        onCreated();
      }
    } catch {
      // handle error silently
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setType('template');
    setSelectedTemplate('');
    setSelectedFlowId('');
    setSearch('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>New Test Scenario</DialogTitle>
          <DialogDescription>
            Create a reusable test scenario for a template or flow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs">Scenario Name</Label>
            <Input
              placeholder="e.g. Welcome message test"
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              placeholder="What does this scenario test?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[60px] text-sm"
            />
          </div>

          {/* Type toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setType('template'); setSearch(''); }}
                className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                  type === 'template'
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/20'
                }`}
              >
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Template</div>
                  <div className="text-[10px] text-muted-foreground">Single message</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setType('flow'); setSearch(''); }}
                className={`flex items-center gap-2 rounded-lg border p-3 transition-colors ${
                  type === 'flow'
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/20'
                }`}
              >
                <GitBranch className="h-4 w-4" />
                <div className="text-left">
                  <div className="text-sm font-medium">Flow</div>
                  <div className="text-[10px] text-muted-foreground">Multi-step</div>
                </div>
              </button>
            </div>
          </div>

          {/* Picker */}
          <div className="space-y-1.5">
            <Label className="text-xs">
              {type === 'template' ? 'Select Template' : 'Select Flow'}
            </Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={`Search ${type === 'template' ? 'templates' : 'flows'}...`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-9 pl-8 text-sm"
              />
            </div>

            <div className="max-h-[180px] space-y-1 overflow-y-auto rounded-lg border border-border p-1.5">
              {type === 'template' ? (
                filteredTemplates.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No approved templates found.
                  </p>
                ) : (
                  filteredTemplates.map(tpl => (
                    <button
                      key={tpl.name}
                      type="button"
                      onClick={() => setSelectedTemplate(tpl.name)}
                      className={`w-full rounded-md p-2 text-left transition-colors ${
                        selectedTemplate === tpl.name
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium font-mono truncate">
                          {tpl.name}
                        </span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {tpl.type}
                        </span>
                      </div>
                      {tpl.body && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                          {tpl.body}
                        </p>
                      )}
                    </button>
                  ))
                )
              ) : (
                filteredFlows.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    No flows found.
                  </p>
                ) : (
                  filteredFlows.map(flow => (
                    <button
                      key={flow.id}
                      type="button"
                      onClick={() => setSelectedFlowId(flow.id)}
                      className={`w-full rounded-md p-2 text-left transition-colors ${
                        selectedFlowId === flow.id
                          ? 'bg-primary/10 border border-primary/30'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate">
                          {flow.name}
                        </span>
                        <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                          {flow.steps.length} steps
                        </span>
                      </div>
                      {flow.description && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
                          {flow.description}
                        </p>
                      )}
                    </button>
                  ))
                )
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || isSaving}>
            {isSaving ? 'Creating...' : 'Create Scenario'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
