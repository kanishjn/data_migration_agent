'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  once?: boolean;
  threshold?: number;
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
  duration = 0.5,
  direction = 'up',
  distance = 20,
  once = true,
  threshold = 0.1,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const prefersReducedMotion = useReducedMotion();

  // Get initial position based on direction
  const getInitialPosition = () => {
    if (prefersReducedMotion) return { x: 0, y: 0 };
    
    switch (direction) {
      case 'up':
        return { x: 0, y: distance };
      case 'down':
        return { x: 0, y: -distance };
      case 'left':
        return { x: distance, y: 0 };
      case 'right':
        return { x: -distance, y: 0 };
      case 'none':
      default:
        return { x: 0, y: 0 };
    }
  };

  const initial = getInitialPosition();

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{
        opacity: prefersReducedMotion ? 1 : 0,
        ...initial,
      }}
      animate={{
        opacity: isInView ? 1 : 0,
        x: isInView ? 0 : initial.x,
        y: isInView ? 0 : initial.y,
      }}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}
