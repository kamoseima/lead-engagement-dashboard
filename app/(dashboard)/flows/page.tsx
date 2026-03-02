'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GitBranch, Plus, Search, ChevronRight, Trash2 } from 'lucide-react';
import type { Flow } from '@/types/database';
import Link from 'next/link';

function countSteps(steps: unknown[]): number {
  let count = 0;
  for (const step of steps) {
    count++;
    const s = step as { branches?: { steps?: unknown[] }[] };
    if (s.branches) {
      for (const branch of s.branches) {
        if (branch.steps) count += countSteps(branch.steps);
      }
    }
  }
  return count;
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadFlows();
  }, []);

  const loadFlows = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/flows');
      const json = await res.json();
      if (json.success) setFlows(json.data);
    } catch {
      // handle error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = async () => {
    try {
      const res = await fetch('/api/v1/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Untitled Flow',
          steps: [],
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Navigate to flow editor
        window.location.href = `/flows/${json.data.id}`;
      }
    } catch {
      // handle error
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm('Delete this flow?')) return;

    try {
      await fetch(`/api/v1/flows/${id}`, { method: 'DELETE' });
      loadFlows();
    } catch {
      // handle error
    }
  };

  const filtered = flows.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flows</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Build multi-step WhatsApp message flows with branching logic.
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          New Flow
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search flows..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Flows List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading flows...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12">
          <GitBranch className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? 'No flows match your search.' : 'No flows yet. Create your first one.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(flow => (
            <Link
              key={flow.id}
              href={`/flows/${flow.id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                  <GitBranch className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium">{flow.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {countSteps(flow.steps)} steps
                    {flow.description && ` — ${flow.description}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {new Date(flow.updated_at).toLocaleDateString()}
                </span>
                <button
                  onClick={e => handleDelete(flow.id, e)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
