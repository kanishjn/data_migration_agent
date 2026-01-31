'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Radio,
  Eye,
  Brain,
  Scale,
  ShieldCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApp } from '@/lib/app-context';

// Navigation mirrors the agent loop: Signals → Patterns → Reasoning → Decisions → Actions → Docs
const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, description: 'Overview' },
  { name: 'Migration', href: '/migration', icon: GitBranch, description: 'Simulate stages' },
  { name: 'Signals', href: '/signals', icon: Radio, description: 'OBSERVE - Raw events' },
  { name: 'Patterns', href: '/patterns', icon: Eye, description: 'Observation layer' },
  { name: 'Reasoning', href: '/reasoning', icon: Brain, description: 'LLM hypotheses' },
  { name: 'Decisions', href: '/decisions', icon: Scale, description: 'Decision engine' },
  { name: 'Actions', href: '/actions', icon: ShieldCheck, description: 'Guarded actions' },
  { name: 'Docs', href: '/docs', icon: BookOpen, description: 'Known issues' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useApp();

  return (
    <motion.aside
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40 flex flex-col',
        'surface-nav surface-border border-r'
      )}
      animate={{
        width: sidebarCollapsed ? 72 : 260,
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo Section */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-zinc-200 dark:border-zinc-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col"
          >
            <span className="text-sm font-medium text-zinc-900 dark:text-white">
              Migration Agent
            </span>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">Command Center</span>
          </motion.div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navigation.map((item, index) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'hover-surface',
                  isActive && 'bg-cyan-500/10 border-l-2 border-cyan-500 dark:border-cyan-400'
                )}
              >
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-md transition-all duration-200',
                    isActive
                      ? 'bg-cyan-500/20'
                      : 'bg-white/80 dark:bg-zinc-800/50 group-hover:bg-cyan-500/10 dark:group-hover:bg-zinc-700/50'
                  )}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 transition-colors',
                      isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                    )}
                  />
                </div>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white'
                    )}
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Agent Status Card */}
      {!sidebarCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-3 mb-3 p-4 rounded-lg surface-subcard surface-border"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 dark:bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 dark:bg-emerald-400"></span>
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Agent Active</span>
          </div>
          <p className="text-xs text-muted">
            Monitoring 245 endpoints across 3 regions
          </p>
        </motion.div>
      )}

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={toggleSidebar}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
            'text-zinc-500 hover:text-zinc-900 dark:hover:text-white',
            'hover:bg-cyan-500/5 dark:hover:bg-zinc-800/50 transition-all duration-200'
          )}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
            'hover-surface transition-all duration-200'
