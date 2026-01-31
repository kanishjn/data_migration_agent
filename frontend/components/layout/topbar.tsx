'use client';

import { motion } from 'framer-motion';
import { Bell, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';
import { useState, useEffect } from 'react';
import { SearchCommand } from './search-command';

interface TopBarProps {
  title?: string;
}

export function TopBar({ title }: TopBarProps) {
  const { systemHealth, sidebarCollapsed, agentLoop } = useApp();
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const healthColor =
    systemHealth.overall === 'healthy'
      ? 'bg-emerald-400'
      : systemHealth.overall === 'degraded'
        ? 'bg-amber-400'
        : 'bg-rose-400';

  const healthTextColor =
    systemHealth.overall === 'healthy'
      ? 'text-emerald-400'
      : systemHealth.overall === 'degraded'
        ? 'text-amber-400'
        : 'text-rose-400';

  const healthLabel =
    systemHealth.overall === 'healthy'
      ? 'Healthy'
      : systemHealth.overall === 'degraded'
        ? 'Degraded'
        : 'Critical';

  // Migration phase display
  const migrationPhaseLabel = {
    'pre_migration': 'Pre-Migration',
    'mid_migration': 'Mid-Migration', 
    'post_migration': 'Post-Migration',
  }[systemHealth.currentMigrationPhase || 'mid_migration'];

  const migrationPhaseColor = {
    'pre_migration': 'text-cyan-500 dark:text-cyan-400',
    'mid_migration': 'text-amber-500 dark:text-amber-400',
    'post_migration': 'text-emerald-500 dark:text-emerald-400',
  }[systemHealth.currentMigrationPhase || 'mid_migration'];

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-16',
        'surface-nav surface-border border-b',
        'flex items-center justify-between px-6',
        'transition-all duration-300'
      )}
      style={{
        left: sidebarCollapsed ? 72 : 260,
      }}
    >
      {/* Left - Search Bar */}
      <div className="relative flex items-center gap-4 flex-1 max-w-md">
        <SearchCommand />
      </div>

      {/* Center - Time Display */}
      <div className="hidden md:block text-xs text-zinc-500 dark:text-zinc-600 font-mono tracking-wide">
        {time} UTC
      </div>

      {/* Right - Controls */}
      <div className="flex items-center gap-3">
        {/* Migration Phase Indicator */}
        <motion.div
          className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full surface-pill surface-border"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.05 }}
        >
          <ArrowRight className="w-3 h-3 text-zinc-400" />
          <span className={cn('text-xs font-medium', migrationPhaseColor)}>{migrationPhaseLabel}</span>
        </motion.div>

        {/* System Health Indicator */}
        <motion.div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full surface-pill surface-border"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <span className="relative flex h-2 w-2">
            {systemHealth.overall !== 'healthy' && (
              <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', healthColor)}></span>
            )}
            <span className={cn('relative inline-flex rounded-full h-2 w-2', healthColor)}></span>
          </span>
          <span className={cn('text-xs font-medium', healthTextColor)}>{healthLabel}</span>
        </motion.div>

        {/* Pending Approvals Badge */}
        {agentLoop.pendingApprovals > 0 && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
          >
            <span className="text-xs font-medium text-amber-500 dark:text-amber-400">
              {agentLoop.pendingApprovals} pending
            </span>
          </motion.div>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
          {systemHealth.activeIncidents > 0 && (
            <span className="absolute top-1 right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
            </span>
          )}
        </button>

        {/* User Avatar */}
        <button
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center hover:opacity-80 transition-all duration-200"
          aria-label="User menu"
        >
          <User className="w-4 h-4 text-white" />
        </button>
      </div>
    </header>
  );
}
