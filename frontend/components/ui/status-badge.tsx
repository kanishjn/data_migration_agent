'use client';

import { cn, getStatusColor } from '@/lib/utils';
import type { IncidentStatus } from '@/types';

interface StatusBadgeProps {
  status: IncidentStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

const labels: Record<IncidentStatus, string> = {
  active: 'Active',
  investigating: 'Investigating',
  mitigating: 'Mitigating',
  resolved: 'Resolved',
  escalated: 'Escalated',
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        getStatusColor(status),
        sizeClasses[size],
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full bg-current',
          status === 'active' && 'animate-pulse'
        )}
      />
      {labels[status]}
    </span>
  );
}
