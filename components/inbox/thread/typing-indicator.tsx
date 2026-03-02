'use client';

interface TypingIndicatorProps {
  agentId: string;
}

export function TypingIndicator({ agentId }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 px-1 py-2">
      <div className="flex gap-0.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '0ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '150ms' }} />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-xs text-muted-foreground">
        {agentId} is typing...
      </span>
    </div>
  );
}
