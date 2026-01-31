'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { cn, getRiskColor } from '@/lib/utils';
import type { RiskLevel } from '@/types';

interface RiskBannerProps {
  riskLevel: RiskLevel;
  title: string;
  description?: string;
  onDismiss?: () => void;
  className?: string;
}

const icons = {
  critical: AlertTriangle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: AlertTriangle,
};

export function RiskBanner({
  riskLevel,
  title,
  description,
  onDismiss,
  className,
}: RiskBannerProps) {
  const Icon = icons[riskLevel];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className={cn(
          'relative flex items-start gap-4 rounded-xl p-4 border',
          getRiskColor(riskLevel),
          className
        )}
      >
        <div className="flex-shrink-0 mt-0.5">
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm">{title}</h4>
          {description && (
            <p className="mt-1 text-sm opacity-80">{description}</p>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
