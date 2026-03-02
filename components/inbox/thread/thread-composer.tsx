'use client';

import { useState, useRef, useCallback } from 'react';
import { useInboxStore } from '@/lib/stores/inbox-store';
import { Send, Slash } from 'lucide-react';
import { CannedResponsePicker } from './canned-response-picker';
import type { TimelineMessage } from '@/types/inbox';

interface ThreadComposerProps {
  conversationId: string;
}

export function ThreadComposer({ conversationId }: ThreadComposerProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showCanned, setShowCanned] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { appendMessage, selectedConversation, updateConversationInList } = useInboxStore();

  const handleSend = useCallback(async () => {
    const body = message.trim();
    if (!body || sending) return;

    setSending(true);

    // Optimistic update
    const optimisticMsg: TimelineMessage = {
      id: `optimistic-${Date.now()}`,
      twilio_conversation_sid: conversationId,
      twilio_message_sid: null,
      channel: selectedConversation?.channel || null,
      status: 'sending',
      subject: null,
      body_preview: body,
      author: 'agent',
      index: null,
      date_created: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    appendMessage(optimisticMsg);
    setMessage('');

    try {
      const res = await fetch(`/api/v1/inbox/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();

      if (json.success) {
        updateConversationInList(conversationId, {
          last_message_at: new Date().toISOString(),
          last_message_preview: body,
          status: 'waiting_on_customer',
        });
      }
    } catch {
      // Could show error toast
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }, [message, sending, conversationId, appendMessage, selectedConversation, updateConversationInList]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Show canned responses on /
    if (e.key === '/' && message === '') {
      e.preventDefault();
      setShowCanned(true);
    }
  };

  const handleCannedSelect = (content: string) => {
    setMessage(content);
    setShowCanned(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative border-t border-border">
      {/* Canned response picker */}
      {showCanned && (
        <CannedResponsePicker
          onSelect={handleCannedSelect}
          onClose={() => setShowCanned(false)}
        />
      )}

      <div className="flex items-end gap-2 p-3">
        {/* Canned responses button */}
        <button
          onClick={() => setShowCanned(!showCanned)}
          title="Canned responses (/)"
          className="shrink-0 rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Slash className="h-4 w-4" />
        </button>

        {/* Input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (Enter to send, / for canned responses)"
          rows={1}
          className="max-h-32 min-h-[2.25rem] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
          }}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="shrink-0 rounded-lg bg-primary p-2 text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
