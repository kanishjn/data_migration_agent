'use client';

import {
  Eye,
  TrendingUp,
  Users,
  Clock,
  AlertCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ConfidenceMeter } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { HealthTrendChart } from '@/components/charts';
import { mockPatterns, mockHealthTrendData } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function PatternsPage() {
  // Pattern type colors and icons
  const patternTypeConfig: Record<string, { color: string; bgColor: string; icon: typeof TrendingUp }> = {
    spike: { color: 'text-rose-700 dark:text-rose-400', bgColor: 'bg-rose-500/10', icon: TrendingUp },
    correlation: { color: 'text-fuchsia-700 dark:text-fuchsia-400', bgColor: 'bg-fuchsia-500/10', icon: Activity },
    anomaly: { color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-500/10', icon: AlertCircle },
    trend: { color: 'text-cyan-700 dark:text-cyan-400', bgColor: 'bg-cyan-500/10', icon: TrendingUp },
    cluster: { color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-500/10', icon: Users },
  };

  return (
    <MainContent>
      {/* Header */}
      <ScrollReveal>
        <div className="flex items-center gap-3 mb-6">
          <motion.div
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full surface-pill surface-border"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Eye className="w-4 h-4 text-fuchsia-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Observation Layer</span>
          </motion.div>
        </div>
        <PageHeader
          title="Patterns"
          description="Correlations and patterns detected from raw signals. Shows what the observation layer has identified — without speculation."
        />
      </ScrollReveal>

      {/* Pattern Summary Cards */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {mockPatterns.map((pattern, index) => {
          const config = patternTypeConfig[pattern.pattern_type] || patternTypeConfig.trend;
          const Icon = config.icon;

          return (
            <StaggerItem key={pattern.id}>
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-lg surface-card surface-border p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn('p-2 rounded-lg', config.bgColor)}>
                    <Icon className={cn('w-5 h-5', config.color)} />
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded text-xs font-medium uppercase',
                    config.bgColor, config.color
                  )}>
                    {pattern.pattern_type}
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                      {pattern.common_error}
                    </p>
                    <p className="text-xs text-zinc-500">
                      Detected in {pattern.time_window}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {pattern.affected_merchants}
                      </span>
                      <span className="text-xs text-zinc-500">merchants</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-white">
                        {pattern.signals.length}
                      </span>
                      <span className="text-xs text-zinc-500">signals</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-500">Pattern confidence</span>
                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{pattern.confidence}%</span>
                    </div>
                    <ConfidenceMeter value={pattern.confidence} size="sm" showLabel={false} />
                  </div>

                  <div className="pt-3 border-t border-zinc-200 dark:border-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(pattern.created_at)}
                      </span>
                      <Link
                        href={`/signals?pattern=${pattern.id}`}
                        className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        View signals
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Pattern Timeline / Trend View */}
      <ScrollReveal delay={0.2}>
        <div className="rounded-lg surface-card surface-border p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-medium text-zinc-900 dark:text-white">Pattern Timeline</h2>
              <p className="text-xs text-zinc-500 mt-1">Signal aggregation proving pattern existence</p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/20">
              <Activity className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
              <span className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-medium">Live aggregation</span>
            </div>
          </div>
          <div className="chart-container">
            <HealthTrendChart data={mockHealthTrendData} height={300} />
          </div>
        </div>
      </ScrollReveal>

      {/* Pattern Details Table */}
      <ScrollReveal delay={0.3} className="mt-6">
        <div className="rounded-lg surface-card surface-border overflow-hidden">
          <div className="p-5 border-b border-zinc-200 dark:border-zinc-800">
            <h2 className="text-base font-medium text-zinc-900 dark:text-white">All Detected Patterns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Pattern</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Affected</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Signals</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Confidence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wide">Time Window</th>
                </tr>
              </thead>
              <tbody>
                {mockPatterns.map((pattern) => {
                  const config = patternTypeConfig[pattern.pattern_type] || patternTypeConfig.trend;
                  return (
                    <tr key={pattern.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover-surface">
                      <td className="px-4 py-3">
                        <p className="text-sm text-zinc-900 dark:text-white">{pattern.common_error}</p>
                        <p className="text-xs text-zinc-500 font-mono">{pattern.id}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('px-2 py-1 rounded text-xs font-medium', config.bgColor, config.color)}>
                          {pattern.pattern_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                        {pattern.affected_merchants} merchants
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-900 dark:text-white">
                        {pattern.signals.length}
                      </td>
                      <td className="px-4 py-3">
                        <ConfidenceMeter value={pattern.confidence} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">
                        {pattern.time_window}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ScrollReveal>
    </MainContent>
  );
}
