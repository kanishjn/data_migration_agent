'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConfidenceMeterProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: { height: 'h-1.5', width: 'w-24', text: 'text-xs' },
  md: { height: 'h-2', width: 'w-32', text: 'text-sm' },
  lg: { height: 'h-3', width: 'w-40', text: 'text-base' },
};

function getConfidenceColor(value: number): string {
  if (value >= 80) return 'bg-emerald-500';
  if (value >= 60) return 'bg-cyan-500';
  if (value >= 40) return 'bg-amber-500';
  return 'bg-rose-500';
}

function getConfidenceTextColor(value: number): string {
  if (value >= 80) return 'text-emerald-400';
  if (value >= 60) return 'text-cyan-400';
  if (value >= 40) return 'text-amber-400';
  return 'text-rose-400';
}

export function ConfidenceMeter({
  value,
  size = 'md',
  showLabel = true,
  animate = true,
  className,
}: ConfidenceMeterProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden',
          sizes.height,
          sizes.width
        )}
      >
        <motion.div
          className={cn('absolute inset-y-0 left-0 rounded-full', getConfidenceColor(clampedValue))}
          initial={animate ? { width: 0 } : { width: `${clampedValue}%` }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
      {showLabel && (
        <span className={cn('font-medium', getConfidenceTextColor(clampedValue), sizes.text)}>
          {clampedValue}%
        </span>
      )}
    </div>
  );
}
