'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

export function StaggerContainer({
  children,
  className,
  staggerDelay = 0.1,
  initialDelay = 0.1,
}: StaggerContainerProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: prefersReducedMotion ? 1 : 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: prefersReducedMotion ? 0 : staggerDelay,
            delayChildren: prefersReducedMotion ? 0 : initialDelay,
          },
        },
      }}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: prefersReducedMotion ? 0 : 0.4,
            ease: 'easeOut',
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
