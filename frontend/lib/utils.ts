import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string to a readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

/**
 * Format a date to relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format duration in seconds to human readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

/**
 * Get color class based on severity
 */
export function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-500 bg-red-500/10 border-red-500/20',
    high: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
    medium: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    low: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    info: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  };
  return colors[severity] || colors.info;
}

/**
 * Get color class based on status
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'text-red-500 bg-red-500/10',
    investigating: 'text-amber-500 bg-amber-500/10',
    mitigating: 'text-blue-500 bg-blue-500/10',
    resolved: 'text-emerald-500 bg-emerald-500/10',
    escalated: 'text-purple-500 bg-purple-500/10',
  };
  return colors[status] || colors.active;
}

/**
 * Get color class based on risk level
 */
export function getRiskColor(risk: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-600 bg-red-100 dark:bg-red-900/30',
    high: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
    medium: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30',
    low: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30',
  };
  return colors[risk] || colors.low;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return `${text.slice(0, length)}...`;
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
