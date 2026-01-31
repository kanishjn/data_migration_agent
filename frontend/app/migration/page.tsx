'use client';

import { useState, useMemo } from 'react';
import {
  Radio,
  Brain,
  Scale,
  Zap,
  MessageSquare,
  ChevronRight,
  Store,
  AlertCircle,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ScrollReveal } from '@/components/motion';
import { mockMerchants, mockFailureEvents } from '@/lib/mock-data';
import { formatRelativeTime, cn } from '@/lib/utils';
import type { MigrationStage, Merchant } from '@/types';

// Pipeline steps
const pipelineSteps = [
  { id: 'observe', label: 'Observe', icon: Radio, color: 'cyan', description: 'Detect signals' },
  { id: 'reason', label: 'Reason', icon: Brain, color: 'fuchsia', description: 'Analyze cause' },
  { id: 'decide', label: 'Decide', icon: Scale, color: 'amber', description: 'Choose action' },
  { id: 'act', label: 'Act', icon: Zap, color: 'emerald', description: 'Execute fix' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: 'rose', description: 'Learn' },
];

const stageLabels: Record<MigrationStage, string> = {
  pre_migration: 'Pre-Migration',
  mid_migration: 'Migrating',
  post_migration: 'Post-Migration',
};

const stageConfig: Record<MigrationStage, { color: string; bgClass: string; textClass: string; borderClass: string }> = {
  pre_migration: {
    color: 'zinc',
    bgClass: 'bg-zinc-500/10',
    textClass: 'text-zinc-400',
    borderClass: 'border-zinc-500/30',
  },
  mid_migration: {
    color: 'amber',
    bgClass: 'bg-amber-500/15',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-500/30',
  },
  post_migration: {
    color: 'emerald',
    bgClass: 'bg-emerald-500/15',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
  },
};

export default function MigrationPage() {
  const [merchants, setMerchants] = useState<Merchant[]>(mockMerchants);
  const [stageFilter, setStageFilter] = useState<MigrationStage | 'all'>('all');
  const [expandedMerchant, setExpandedMerchant] = useState<string | null>(null);
  const [activePipelineStep, setActivePipelineStep] = useState<string>('observe');

  // Filter merchants by stage
  const filteredMerchants = useMemo(() => {
    if (stageFilter === 'all') return merchants;
    return merchants.filter((m) => m.migration_stage === stageFilter);
  }, [merchants, stageFilter]);

  // Calculate stats by stage
  const stageStats = useMemo(() => {
    return {
      pre_migration: merchants.filter((m) => m.migration_stage === 'pre_migration'),
      mid_migration: merchants.filter((m) => m.migration_stage === 'mid_migration'),
      post_migration: merchants.filter((m) => m.migration_stage === 'post_migration'),
    };
  }, [merchants]);

  // Handler to change merchant stage
  const handleStageChange = (merchantId: string, newStage: MigrationStage) => {
    setMerchants((prev) =>
      prev.map((m) =>
        m.id === merchantId
          ? {
              ...m,
              migration_stage: newStage,
              error_rate:
                newStage === 'mid_migration'
                  ? Math.min(30, m.error_rate * 5 + Math.random() * 10)
                  : newStage === 'post_migration'
                    ? Math.max(0.1, m.error_rate * 0.2)
                    : Math.max(0.05, m.error_rate * 0.1),
              failure_count_24h:
                newStage === 'mid_migration'
                  ? m.failure_count_24h * 3 + Math.floor(Math.random() * 20)
                  : newStage === 'post_migration'
                    ? Math.max(1, Math.floor(m.failure_count_24h * 0.3))
                    : Math.max(0, Math.floor(m.failure_count_24h * 0.1)),
              enabled_features:
                newStage === 'post_migration'
                  ? ['headless_checkout', 'webhooks_v2', 'custom_storefront']
                  : newStage === 'mid_migration'
                    ? ['headless_checkout']
                    : [],
              migrated_at: newStage === 'post_migration' ? new Date().toISOString() : undefined,
            }
          : m
      )
    );
  };

  return (
    <MainContent>
      <ScrollReveal>
        <PageHeader
          title="Migration Simulation"
          description="Simulate merchant migration stages and observe how failures correlate with each phase."
        />
      </ScrollReveal>

      {/* Agent Loop Pipeline - Horizontal Flow */}
      <ScrollReveal delay={0.1} className="mb-8">
        <div className="rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Agent Loop Pipeline</h2>
          
          <div className="flex items-center justify-between gap-2">
            {pipelineSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activePipelineStep === step.id;
              const colorClasses = {
                cyan: { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400', glow: 'shadow-cyan-500/20' },
                fuchsia: { bg: 'bg-fuchsia-500/20', border: 'border-fuchsia-500', text: 'text-fuchsia-400', glow: 'shadow-fuchsia-500/20' },
                amber: { bg: 'bg-amber-500/20', border: 'border-amber-500', text: 'text-amber-400', glow: 'shadow-amber-500/20' },
                emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500', text: 'text-emerald-400', glow: 'shadow-emerald-500/20' },
                rose: { bg: 'bg-rose-500/20', border: 'border-rose-500', text: 'text-rose-400', glow: 'shadow-rose-500/20' },
              }[step.color];

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <motion.button
                    onClick={() => setActivePipelineStep(step.id)}
                    className={cn(
                      'flex-1 flex flex-col items-center p-4 rounded-xl border-2 transition-all cursor-pointer',
                      isActive
                        ? cn(colorClasses?.bg, colorClasses?.border, 'shadow-lg', colorClasses?.glow)
                        : 'border-zinc-700 hover:border-zinc-600'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center mb-3',
                      isActive ? colorClasses?.bg : 'bg-zinc-800'
                    )}>
                      <Icon className={cn('w-6 h-6', isActive ? colorClasses?.text : 'text-zinc-400')} />
                    </div>
                    <span className={cn('text-sm font-semibold', isActive ? 'text-white' : 'text-zinc-400')}>
                      {step.label}
                    </span>
                    <span className="text-xs text-zinc-500 mt-1 text-center">
                      {step.description}
                    </span>
                  </motion.button>
                  
                  {index < pipelineSteps.length - 1 && (
                    <ChevronRight className="w-6 h-6 text-zinc-600 mx-2 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Migration Stage Overview */}
      <ScrollReveal delay={0.15} className="mb-8">
        <div className="grid grid-cols-3 gap-4">
          {(['pre_migration', 'mid_migration', 'post_migration'] as MigrationStage[]).map((stage) => {
            const config = stageConfig[stage];
            const stageMerchants = stageStats[stage];
            const totalFailures = stageMerchants.reduce((sum, m) => sum + m.failure_count_24h, 0);
            const avgErrorRate = stageMerchants.length > 0
              ? stageMerchants.reduce((sum, m) => sum + m.error_rate, 0) / stageMerchants.length
              : 0;
            const isMigrating = stage === 'mid_migration';

            return (
              <motion.div
                key={stage}
                className={cn(
                  'relative rounded-xl border-2 p-5 transition-all',
                  config.borderClass,
                  isMigrating && 'ring-2 ring-amber-500/30'
                )}
                whileHover={{ scale: 1.01 }}
              >
                {isMigrating && (
                  <div className="absolute -top-3 left-4 px-2 py-0.5 rounded bg-amber-500 text-black text-xs font-bold">
                    ⚠️ HIGH RISK
                  </div>
                )}
                
                <div className="flex items-center gap-2 mb-4">
                  <div className={cn('w-3 h-3 rounded-full', 
                    stage === 'pre_migration' ? 'bg-zinc-500' :
                    stage === 'mid_migration' ? 'bg-amber-500' : 'bg-emerald-500'
                  )} />
                  <span className={cn('font-semibold', config.textClass)}>
                    {stageLabels[stage]}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Merchants</span>
                    <span className="text-white font-bold text-lg">{stageMerchants.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">24h Failures</span>
                    <span className={cn('font-bold text-lg', isMigrating ? 'text-amber-400' : 'text-white')}>
                      {totalFailures}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 text-sm">Avg Error Rate</span>
                    <span className={cn('font-bold', avgErrorRate > 5 ? 'text-rose-400' : 'text-white')}>
                      {avgErrorRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </ScrollReveal>

      {/* Key Insight Banner */}
      <ScrollReveal delay={0.2} className="mb-8">
        <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-amber-400 font-semibold">Key Insight</p>
            <p className="text-zinc-300 text-sm mt-1">
              Mid-migration merchants show <strong className="text-amber-400">10-20x higher error rates</strong> than 
              pre-migration. Failures spike immediately after migration begins and stabilize 48-72h post-migration.
            </p>
          </div>
        </div>
      </ScrollReveal>

      {/* Merchant List with Stage Controls */}
      <ScrollReveal delay={0.25}>
        <div className="rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Merchant Stage Control</h2>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-500" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as MigrationStage | 'all')}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Stages</option>
                <option value="pre_migration">Pre-Migration</option>
                <option value="mid_migration">Migrating</option>
                <option value="post_migration">Post-Migration</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filteredMerchants.map((merchant) => {
              const config = stageConfig[merchant.migration_stage];
              const isExpanded = expandedMerchant === merchant.id;

              return (
                <div
                  key={merchant.id}
                  className={cn(
                    'rounded-lg border transition-all',
                    merchant.error_rate > 10 ? 'border-rose-500/50' : 'border-zinc-800'
                  )}
                >
                  {/* Merchant Row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-800/30 transition-colors"
                    onClick={() => setExpandedMerchant(isExpanded ? null : merchant.id)}
                  >
                    <div className="flex items-center gap-4">
                      <Store className="w-5 h-5 text-zinc-500" />
                      <div>
                        <p className="font-medium text-white">{merchant.name}</p>
                        <p className="text-xs text-zinc-500">{merchant.id} • {merchant.region}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border',
                        config.bgClass, config.textClass, config.borderClass
                      )}>
                        {stageLabels[merchant.migration_stage]}
                      </span>

                      <div className="text-right w-20">
                        <p className="text-xs text-zinc-500">Error Rate</p>
                        <p className={cn('font-semibold', merchant.error_rate > 5 ? 'text-rose-400' : 'text-white')}>
                          {merchant.error_rate.toFixed(1)}%
                        </p>
                      </div>

                      <div className="text-right w-20">
                        <p className="text-xs text-zinc-500">Failures</p>
                        <p className={cn('font-semibold', merchant.failure_count_24h > 50 ? 'text-rose-400' : 'text-white')}>
                          {merchant.failure_count_24h}
                        </p>
                      </div>

                      <ChevronDown className={cn(
                        'w-5 h-5 text-zinc-500 transition-transform',
                        isExpanded && 'rotate-180'
                      )} />
                    </div>
                  </div>

                  {/* Expanded Section */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-zinc-800 overflow-hidden"
                      >
                        <div className="p-4 space-y-4">
                          {/* Stage Buttons */}
                          <div>
                            <p className="text-sm font-medium text-white mb-3">Change Migration Stage</p>
                            <div className="flex gap-3">
                              {(['pre_migration', 'mid_migration', 'post_migration'] as MigrationStage[]).map((stage) => {
                                const stageConf = stageConfig[stage];
                                const isActive = merchant.migration_stage === stage;
                                
                                return (
                                  <button
                                    key={stage}
                                    onClick={() => handleStageChange(merchant.id, stage)}
                                    className={cn(
                                      'flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all',
                                      isActive
                                        ? cn(stageConf.bgClass, stageConf.borderClass, stageConf.textClass)
                                        : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
                                    )}
                                  >
                                    {stageLabels[stage]}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Stats Grid */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg border border-zinc-800">
                              <p className="text-xs text-zinc-500 mb-1">Volume (24h)</p>
                              <p className="font-semibold text-white">{merchant.checkout_volume_24h.toLocaleString()}</p>
                            </div>
                            <div className="p-3 rounded-lg border border-zinc-800">
                              <p className="text-xs text-zinc-500 mb-1">Last Failure</p>
                              <p className="font-semibold text-white">
                                {merchant.last_failure ? formatRelativeTime(merchant.last_failure) : 'None'}
                              </p>
                            </div>
                            <div className="p-3 rounded-lg border border-zinc-800">
                              <p className="text-xs text-zinc-500 mb-1">Features</p>
                              <p className="font-semibold text-white">{merchant.enabled_features.length}</p>
                            </div>
                            <div className="p-3 rounded-lg border border-zinc-800">
                              <p className="text-xs text-zinc-500 mb-1">Migrated</p>
                              <p className="font-semibold text-white">
                                {merchant.migrated_at ? formatRelativeTime(merchant.migrated_at) : '—'}
                              </p>
                            </div>
                          </div>

                          {/* Features */}
                          {merchant.enabled_features.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {merchant.enabled_features.map((feature) => (
                                <span
                                  key={feature}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-500/30 text-cyan-400 text-xs"
                                >
                                  <Zap className="w-3 h-3" />
                                  {feature.replace(/_/g, ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* Failure Timeline */}
      <ScrollReveal delay={0.3} className="mt-8">
        <div className="rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Failure Events</h2>
          <div className="space-y-2">
            {mockFailureEvents.slice(0, 6).map((event) => {
              const config = stageConfig[event.migration_stage];
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'w-2 h-2 rounded-full flex-shrink-0',
                      event.resolved ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                    )} />
                    <div>
                      <p className="text-sm text-white">{event.error_type.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-zinc-500">{event.merchant_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn('px-2 py-0.5 rounded text-xs', config.bgClass, config.textClass)}>
                      {stageLabels[event.migration_stage]}
                    </span>
                    <span className="text-xs text-zinc-500 w-20 text-right">
                      {formatRelativeTime(event.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>
    </MainContent>
  );
}
