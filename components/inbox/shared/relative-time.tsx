'use client';

import { useState, useEffect } from 'react';

function formatRelative(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;

  if (diff < 0) return 'just now';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;

  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

interface RelativeTimeProps {
  date: string | null;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const [display, setDisplay] = useState(() => date ? formatRelative(date) : '');

  useEffect(() => {
    if (!date) return;
    setDisplay(formatRelative(date));
    const interval = setInterval(() => setDisplay(formatRelative(date)), 30000);
    return () => clearInterval(interval);
  }, [date]);

  if (!date) return null;

  return (
    <time
      dateTime={date}
      title={new Date(date).toLocaleString()}
      className={className}
    >
      {display}
    </time>
  );
}
