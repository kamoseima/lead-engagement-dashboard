import type { LeadSegment } from '@/types/database';

const SEGMENT_COLORS: Record<LeadSegment, string> = {
  hot: 'bg-red-500/10 text-red-400 border-red-500/30',
  warm: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  cold: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  unresponsive: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
};

export function ScoreBadge({ score, segment }: { score: number; segment: LeadSegment }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold tabular-nums ${SEGMENT_COLORS[segment]}`}>
      {score}
    </span>
  );
}

export function SegmentBadge({ segment }: { segment: LeadSegment }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${SEGMENT_COLORS[segment]}`}>
      {segment}
    </span>
  );
}
