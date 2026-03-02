'use client';

import { useState, useEffect, useCallback } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { Send, StickyNote } from 'lucide-react';
import type { ConversationNote } from '@/types/inbox';

interface ContactNotesTabProps {
  conversationId: string;
}

export function ContactNotesTab({ conversationId }: ContactNotesTabProps) {
  const { notes, setNotes, addNote } = useInboxStore();
  const [noteText, setNoteText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/inbox/conversations/${conversationId}/notes`);
      const json = await res.json();
      if (json.success && json.data) {
        setNotes(json.data.notes || []);
      }
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, setNotes]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async () => {
    const content = noteText.trim();
    if (!content || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/v1/inbox/conversations/${conversationId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        addNote(json.data as ConversationNote);
        setNoteText('');
      }
    } catch {
      // Could show error
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-lg bg-muted/50 p-3">
                <div className="h-2 w-1/3 rounded bg-muted" />
                <div className="mt-2 h-2 w-full rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <StickyNote className="h-6 w-6 text-muted-foreground/50" />
            <p className="mt-2 text-xs text-muted-foreground">No internal notes yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notes.map(note => (
              <div key={note.id} className="rounded-lg border border-[hsl(var(--warning)/0.2)] bg-[hsl(var(--warning)/0.05)] p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {note.agent_name || note.agent_id}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(note.created_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add note input */}
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Add internal note..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!noteText.trim() || sending}
            className="shrink-0 self-end rounded-lg bg-[hsl(var(--warning))] p-2 text-[hsl(var(--warning-foreground))] hover:bg-[hsl(var(--warning)/0.9)] disabled:opacity-50 transition-colors"
            title="Add note"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
