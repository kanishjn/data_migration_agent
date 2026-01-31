'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface FadeTransitionProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
  duration?: number;
}

interface SlideTransitionProps {
  children: React.ReactNode;
  show: boolean;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}

export function FadeTransition({
  children,
  show,
  className,
  duration = 0.3,
}: FadeTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : duration, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SlideTransition({
  children,
  show,
  className,
  direction = 'up',
  duration = 0.3,
}: SlideTransitionProps) {
  const prefersReducedMotion = useReducedMotion();

  const getOffset = () => {
    const distance = 16;
    switch (direction) {
      case 'up':
        return { x: 0, y: distance };
      case 'down':
        return { x: 0, y: -distance };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
    }
  };

  const offset = getOffset();

  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial={{
            opacity: prefersReducedMotion ? 1 : 0,
            x: prefersReducedMotion ? 0 : offset.x,
            y: prefersReducedMotion ? 0 : offset.y,
          }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{
            opacity: 0,
            x: prefersReducedMotion ? 0 : offset.x,
            y: prefersReducedMotion ? 0 : offset.y,
          }}
          transition={{ duration: prefersReducedMotion ? 0 : duration, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
