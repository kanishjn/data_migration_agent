'use client';

import { cn, getSeverityColor } from '@/lib/utils';
import type { Severity } from '@/types';

interface SeverityBadgeProps {
  severity: Severity;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const labels: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
};

export function SeverityBadge({
  severity,
  size = 'md',
  showDot = true,
  className,
}: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium border',
        getSeverityColor(severity),
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            severity === 'critical' && 'bg-red-500 animate-pulse',
            severity === 'high' && 'bg-orange-500',
            severity === 'medium' && 'bg-amber-500',
            severity === 'low' && 'bg-blue-500',
            severity === 'info' && 'bg-slate-500'
          )}
        />
      )}
      {labels[severity]}
    </span>
  );
}
