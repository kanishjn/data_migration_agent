'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
  Zap,
  ArrowRight,
  Sparkles,
  Users,
  ShoppingCart,
  ShieldCheck,
  Radio,
  Eye,
  Brain,
  Scale,
  RefreshCw,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { GlassCard, SeverityBadge, StatusBadge, ConfidenceMeter } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { HealthTrendChart, MigrationProgressChart } from '@/components/charts';
import { useApp } from '@/lib/app-context';
import { useApiContext } from '@/lib/api-context';
import { formatRelativeTime, formatPercentage } from '@/lib/utils';

export default function DashboardPage() {
  const { incidents, systemHealth, agentLoop } = useApp();
  const { useApi, ingestSimulation, refresh, loading, error, healthStatus, pendingActions } = useApiContext();
  const [ingesting, setIngesting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleIngest = async () => {
    setIngesting(true);
    try {
      await ingestSimulation();
    } finally {
      setIngesting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  // Stats derived from backend sources as per spec
  const stats = [
    {
      label: 'Active Incidents',
      value: systemHealth.activeIncidents.toString(),
      description: 'Open reasoning outputs above threshold',
      icon: AlertCircle,
      color: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-gradient-to-br from-rose-500/15 to-rose-600/5',
      iconBg: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      href: '/incidents',
    },
    {
      label: 'Checkout Failure Rate',
      value: formatPercentage(systemHealth.checkoutFailureRate),
      description: 'Aggregated from checkout signals',
      icon: ShoppingCart,
      color: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-gradient-to-br from-amber-500/15 to-amber-600/5',
      iconBg: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      href: '/signals',
    },
    {
      label: 'Affected Merchants',
      value: systemHealth.affectedMerchants.toString(),
      description: 'Unique merchants from active patterns',
      icon: Users,
      color: 'text-cyan-700 dark:text-cyan-400',
      bgColor: 'bg-gradient-to-br from-cyan-500/15 to-cyan-600/5',
      iconBg: 'bg-cyan-500/10',
      borderColor: 'border-cyan-500/20',
      href: '/patterns',
    },
    {
      label: 'Pending Approvals',
      value: pendingActions.filter(a => a.status === 'pending').length.toString(),
      description: 'Actions requiring human approval',
      icon: ShieldCheck,
      color: 'text-fuchsia-700 dark:text-fuchsia-400',
      bgColor: 'bg-gradient-to-br from-fuchsia-500/15 to-fuchsia-600/5',
      iconBg: 'bg-fuchsia-500/10',
      borderColor: 'border-fuchsia-500/20',
      href: '/actions',
    },
  ];

  // Activity type icons
  const activityIcons: Record<string, typeof Radio> = {
    signal: Radio,
    pattern: Eye,
    reasoning: Brain,
    decision: Scale,
    action: ShieldCheck,
  };

  // Activity type colors
  const activityColors: Record<string, string> = {
    signal: 'text-cyan-700 dark:text-cyan-400',
    pattern: 'text-fuchsia-700 dark:text-fuchsia-400',
    reasoning: 'text-amber-700 dark:text-amber-400',
    decision: 'text-emerald-700 dark:text-emerald-400',
    action: 'text-rose-700 dark:text-rose-400',
  };

  return (
    <MainContent>
      {/* API Status Banner */}
      {useApi && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400">
              Connected to Backend API
              {healthStatus && ` • v${healthStatus.version}`}
              {healthStatus?.checks?.events_pending !== undefined && ` • ${healthStatus.checks.events_pending} events pending`}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>
      )}
      {!useApi && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-3"
        >
          <WifiOff className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-amber-700 dark:text-amber-400">
            Backend not connected • Connect backend at localhost:8000 for live data
          </span>
        </motion.div>
      )}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center gap-3"
        >
          <AlertCircle className="w-4 h-4 text-rose-500" />
          <span className="text-sm text-rose-600 dark:text-rose-400">{error}</span>
        </motion.div>
      )}

      {/* Hero Section */}
      <div className="relative mb-8">
        <ScrollReveal>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <motion.div
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full surface-pill surface-border"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 dark:bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 dark:bg-cyan-400"></span>
                </span>
                <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">AI-Powered Monitoring</span>
              </motion.div>
            </div>
            <PageHeader
              title="Command Center"
              description={useApi
                ? `Real-time incident intelligence. ${incidents.length} incidents tracked, ${pendingActions.filter(a => a.status === 'pending').length} actions pending.`
                : 'Real-time overview of your migration health and agent activity. Connect backend for live data.'}
            />
            {useApi && (
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button
                  onClick={handleIngest}
                  disabled={ingesting}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/30 text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <Database className="w-4 h-4" />
                  {ingesting ? 'Ingesting...' : 'Ingest Simulation Data'}
                </button>
                <span className="text-xs text-zinc-500">Seed event store with demo data for pattern detection</span>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StaggerItem key={stat.label}>
            <Link href={stat.href}>
              <motion.div
                whileHover={{ y: -2 }}
                transition={{ duration: 0.2 }}
                className={`relative overflow-hidden rounded-lg surface-card border ${stat.borderColor} p-5 cursor-pointer`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight">{stat.value}</p>
                    <p className="text-xs mt-2 text-muted">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-lg ${stat.iconBg}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                {/* Subtle glow */}
                <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full ${stat.bgColor} blur-2xl`} />
              </motion.div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Migration Stage Distribution */}
      <ScrollReveal delay={0.05} className="mb-8">
        <div className="rounded-lg surface-card surface-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-medium text-zinc-900 dark:text-white">Migration Stage Distribution</h2>
              <p className="text-xs text-zinc-500 mt-1">Merchants by migration phase</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 p-4 rounded-lg surface-subcard surface-border">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Migration stages</p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-white">N/A</p>
              <p className="text-xs text-muted mt-1">Connect backend for distribution</p>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Health Trend Chart - Spans 2 columns */}
        <ScrollReveal delay={0.1} className="lg:col-span-2">
          <div className="rounded-lg surface-card surface-border p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-medium text-zinc-900 dark:text-white">System Health Trend</h2>
                <p className="text-xs text-zinc-500 mt-1">Last 24 hours performance</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+2.3%</span>
              </div>
            </div>
            <div className="chart-container">
              <HealthTrendChart data={[]} height={260} />
            </div>
          </div>
        </ScrollReveal>

        {/* Recent Activity Feed */}
        <ScrollReveal delay={0.2}>
          <div className="h-full rounded-lg surface-card surface-border p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-medium text-zinc-900 dark:text-white">Recent Activity</h2>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-500 dark:bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 dark:bg-cyan-400"></span>
                </span>
                <span className="text-xs text-cyan-600 dark:text-cyan-400 font-medium">Live</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Recent activity will be populated from backend when available */}
              <div className="text-xs text-zinc-500">No recent activity yet — connect backend for live feed.</div>
            </div>

            <Link
              href="/signals"
              className="flex items-center justify-between w-full p-3 mt-4 rounded-lg surface-subcard surface-border hover:border-cyan-500/50 transition-all group"
            >
              <span className="text-sm font-medium text-zinc-900 dark:text-white">View all signals</span>
              <ArrowRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            {/* Decorative gradient */}
            <div className="absolute -bottom-16 -right-16 w-32 h-32 rounded-full bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/10 blur-3xl" />
          </div>
        </ScrollReveal>
      </div>

      {/* Active Incidents */}
      <ScrollReveal delay={0.3} className="mt-6">
        <div className="rounded-lg surface-card surface-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-medium text-zinc-900 dark:text-white">Active Incidents</h2>
              <p className="text-xs text-zinc-500 mt-1">
                {activeIncidents.length} incidents require attention
              </p>
            </div>
            <Link
              href="/reasoning"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-all text-xs font-medium text-rose-600 dark:text-rose-400 group"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="space-y-2">
            {activeIncidents.slice(0, 3).map((incident, index) => (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Link
                  href={`/incidents/${incident.id}`}
                  className="block group"
                >
                  <div className="flex items-start gap-4 p-3 rounded-lg hover-surface transition-all">
                    <div className="flex-shrink-0 mt-0.5">
                      <SeverityBadge severity={incident.severity} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-zinc-900 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors truncate">
                        {incident.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-1">
                        {incident.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={incident.status} size="sm" />
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(incident.createdAt)}
                        </span>
                        <span className="text-xs text-zinc-400 dark:text-zinc-600">
                          {incident.signals.length} signals
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400 dark:text-zinc-600 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </MainContent>
  );
}
