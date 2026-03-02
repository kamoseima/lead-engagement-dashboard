'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import type { CannedResponse } from '@/types/inbox';

interface CannedResponsePickerProps {
  onSelect: (content: string) => void;
  onClose: () => void;
}

export function CannedResponsePicker({ onSelect, onClose }: CannedResponsePickerProps) {
  const [responses, setResponses] = useState<CannedResponse[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const params = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/api/v1/inbox/canned-responses${params}`);
        const json = await res.json();
        if (json.success && json.data) {
          setResponses(json.data.canned_responses || []);
        }
      } catch {
        setResponses([]);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, responses.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (responses[selectedIndex]) {
          onSelect(responses[selectedIndex].content);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  return (
    <div className="absolute bottom-full left-0 right-0 z-10 mb-1 mx-3">
      <div className="rounded-lg border border-border bg-card shadow-lg">
        {/* Search */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search canned responses..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* List */}
        <div className="max-h-48 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-xs text-muted-foreground">Loading...</div>
          ) : responses.length === 0 ? (
            <div className="p-3 text-center text-xs text-muted-foreground">No canned responses found</div>
          ) : (
            responses.map((resp, i) => (
              <button
                key={resp.id}
                onClick={() => onSelect(resp.content)}
                className={`w-full px-3 py-2 text-left transition-colors ${i === selectedIndex ? 'bg-primary/10' : 'hover:bg-muted'}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{resp.name}</span>
                  {resp.shortcut && (
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      /{resp.shortcut}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{resp.content}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
