'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  gradient?: boolean;
}

const paddingClasses = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, elevated = false, padding = 'md', hover = false, gradient = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'transition-all duration-300',
          elevated ? 'glass-elevated' : 'glass',
          paddingClasses[padding],
          hover && 'hover:shadow-lg hover:-translate-y-0.5 cursor-pointer',
          gradient && 'stat-card',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
