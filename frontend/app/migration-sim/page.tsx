'use client';

import { useState, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  RotateCcw,
  Store,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { cn } from '@/lib/utils';

interface MerchantStatus {
  merchant_id: string;
  merchant_name: string;
  monthly_orders: number;
  current_stage: 'pre_migration' | 'in_progress' | 'post_migration' | 'completed';
  progress: number;
  health_score: number;
  current_issue: string | null;
  migration_started_at: string | null;
  estimated_completion: string | null;
}

interface SimulationSummary {
  total_merchants: number;
  completed: number;
  in_progress: number;
  pending: number;
  average_health_score: number;
  overall_progress: number;
}

interface SimulationData {
  timestamp: string;
  summary: SimulationSummary;
  merchants: MerchantStatus[];
}

const stageConfig = {
  pre_migration: {
    label: 'Pre-Migration',
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/10',
    borderColor: 'border-zinc-500/20',
  },
  in_progress: {
    label: 'In Progress',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
  },
  post_migration: {
    label: 'Post-Migration',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
  },
  completed: {
    label: 'Completed',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
  },
};

export default function MigrationSimulationPage() {
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/migration/status`);
      const data = await response.json();
      setSimulationData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch migration status:', error);
      setLoading(false);
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    const interval = setInterval(() => {
      fetchStatus();
    }, 3000); // Update every 3 seconds

    // Store interval ID for cleanup
    (window as any).migrationInterval = interval;
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if ((window as any).migrationInterval) {
      clearInterval((window as any).migrationInterval);
      (window as any).migrationInterval = null;
    }
  };

  const resetSimulation = () => {
    stopSimulation();
    fetchStatus();
  };

  useEffect(() => {
    fetchStatus();

    return () => {
      stopSimulation();
    };
  }, []);

  const getHealthColor = (score: number): string => {
    if (score >= 0.8) return 'text-emerald-400';
    if (score >= 0.6) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getHealthBgColor = (score: number): string => {
    if (score >= 0.8) return 'bg-emerald-500/10';
    if (score >= 0.6) return 'bg-amber-500/10';
    return 'bg-rose-500/10';
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
            <Activity className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">LIVE SIMULATION</span>
          </motion.div>
        </div>
        <PageHeader
          title="Migration Simulation"
          description="Real-time visualization of merchant migrations, health status, and agent interventions."
        />
      </ScrollReveal>

      {/* Controls */}
      <ScrollReveal delay={0.2}>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={isSimulating ? stopSimulation : startSimulation}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium',
              isSimulating
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
            )}
          >
            {isSimulating ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Simulation
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Simulation
              </>
            )}
          </button>

          <button
            onClick={resetSimulation}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-zinc-100 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>

          {isSimulating && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 ml-auto"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs text-emerald-500 font-medium">LIVE</span>
            </motion.div>
          )}
        </div>
      </ScrollReveal>

      {/* Summary Stats */}
      {simulationData && (
        <ScrollReveal delay={0.3}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg surface-card surface-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Total Merchants</span>
                <Store className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-bold text-zinc-900 dark:text-white">
                {simulationData.summary.total_merchants}
              </div>
            </div>

            <div className="rounded-lg surface-card surface-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">In Progress</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {simulationData.summary.in_progress}
              </div>
            </div>

            <div className="rounded-lg surface-card surface-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Completed</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {simulationData.summary.completed}
              </div>
            </div>

            <div className="rounded-lg surface-card surface-border p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-500">Avg Health</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                {(simulationData.summary.average_health_score * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Merchant Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-zinc-200 dark:border-zinc-800 border-t-cyan-500 rounded-full animate-spin"></div>
            <span className="text-sm text-zinc-500">Loading simulation data...</span>
          </div>
        </div>
      ) : simulationData ? (
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {simulationData.merchants.map((merchant, index) => {
            const stageInfo = stageConfig[merchant.current_stage];
            return (
              <StaggerItem key={merchant.merchant_id}>
                <motion.div
                  layout
                  className="rounded-lg surface-card surface-border p-4 hover-surface transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-900 dark:text-white truncate">
                        {merchant.merchant_name}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {merchant.monthly_orders.toLocaleString()} orders/month
                      </p>
                    </div>
                    <Store className="w-4 h-4 text-zinc-400 flex-shrink-0 ml-2" />
                  </div>

                  {/* Stage Badge */}
                  <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium mb-3', stageInfo.bgColor, stageInfo.color, stageInfo.borderColor, 'border')}>
                    <div className={cn('w-1.5 h-1.5 rounded-full', merchant.current_stage === 'in_progress' ? 'animate-pulse bg-current' : 'bg-current')}></div>
                    {stageInfo.label}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-500">Progress</span>
                      <span className="text-zinc-900 dark:text-white font-medium">{merchant.progress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${merchant.progress}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    </div>
                  </div>

                  {/* Health Score */}
                  <div className={cn('flex items-center justify-between p-2 rounded-lg mb-2', getHealthBgColor(merchant.health_score))}>
                    <span className="text-xs text-zinc-500">Health Score</span>
                    <span className={cn('text-sm font-medium', getHealthColor(merchant.health_score))}>
                      {(merchant.health_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Current Issue */}
                  {merchant.current_issue && (
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        {merchant.current_issue}
                      </p>
                    </div>
                  )}
                </motion.div>
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      ) : (
        <div className="text-center py-12 text-zinc-500">
          No simulation data available
        </div>
      )}
    </MainContent>
  );
}
