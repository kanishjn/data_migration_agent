'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  icon,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-xl border border-surface-border overflow-hidden', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-foreground/5 transition-colors"
        aria-expanded={isOpen}
      >
        {icon && <span className="text-foreground-muted">{icon}</span>}
        <span className="flex-1 font-medium text-foreground">{title}</span>
        {badge && <span>{badge}</span>}
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="text-foreground-muted"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 border-t border-surface-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
