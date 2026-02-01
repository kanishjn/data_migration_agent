'use client';

import { useState } from 'react';
import {
  Radio,
  Filter,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  Code,
  ExternalLink,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { SeverityBadge } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
// signals are provided by the backend via ApiContext
import { useApiContext } from '@/lib/api-context';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { Signal, Severity } from '@/types';

export default function SignalsPage() {
  const { events, useApi, loading, refresh } = useApiContext();
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  const sources = ['all', 'checkout', 'webhook', 'api', 'ticket', 'metric'];
  const severities = ['all', 'critical', 'high', 'medium', 'low'];

  // Transform API events to signal format or use mock data
  const signals: Signal[] = useApi && events.length > 0 
    ? events.map(event => ({
        id: String(event.id),
        source: (event.source || 'api') as Signal['source'],
        severity: 'medium' as Severity,
        event_type: event.event_type,
        title: event.event_type.replace(/_/g, ' '),
        description: event.error_code || event.event_type,
        timestamp: event.timestamp,
        merchant_id: event.merchant_id,
        migration_stage: (event.migration_stage as Signal['migration_stage']) || undefined,
        raw_text: event.raw_payload ? JSON.stringify(event.raw_payload, null, 2) : undefined,
        error_codes: event.error_code ? [event.error_code] : [],
        metadata: event.raw_payload || {},
      }))
    : [];

  const filteredSignals = signals.filter((signal) => {
    if (filterSource !== 'all' && signal.source !== filterSource) return false;
    if (filterSeverity !== 'all' && signal.severity !== filterSeverity) return false;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedSignal(expandedSignal === id ? null : id);
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
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">OBSERVE Layer</span>
          </motion.div>
        </div>
        <PageHeader
          title="Signals"
          description="Ground truth layer. Raw signal events ingested from various sources. No AI interpretation — just the facts."
        />
      </ScrollReveal>

      {/* API Status */}
      {useApi && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Wifi className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-emerald-700 dark:text-emerald-400">
              Connected to backend • {signals.length} events captured
            </span>
          </div>
          <button
            onClick={() => refresh()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </motion.div>
      )}

      {/* Filters */}
      <ScrollReveal delay={0.1}>
        <div className="flex flex-wrap gap-4 mb-6 p-4 rounded-lg surface-card surface-border">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-500">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Source:</span>
            <div className="flex gap-1">
              {sources.map((source) => (
                <button
                  key={source}
                  onClick={() => setFilterSource(source)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    filterSource === source
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                  )}
                >
                  {source}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Severity:</span>
            <div className="flex gap-1">
              {severities.map((severity) => (
                <button
                  key={severity}
                  onClick={() => setFilterSeverity(severity)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium transition-all',
                    filterSeverity === severity
                      ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-transparent hover:border-zinc-300 dark:hover:border-zinc-600'
                  )}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Signal List */}
      <StaggerContainer className="space-y-3">
        {filteredSignals.map((signal, index) => (
          <StaggerItem key={signal.id}>
            <div className="rounded-lg surface-card surface-border overflow-hidden">
              {/* Signal Header - Clickable */}
              <button
                onClick={() => toggleExpand(signal.id)}
                className="w-full p-4 flex items-start gap-4 text-left hover-surface transition-all"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <SeverityBadge severity={signal.severity} size="sm" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                      {signal.event_type}
                    </span>
                    {signal.migration_stage && (
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded',
                        signal.migration_stage === 'post_migration' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                        signal.migration_stage === 'mid_migration' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                      )}>
                        {signal.migration_stage.replace('_', '-')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-1">
                    {signal.title}
                  </h3>
                  <p className="text-xs text-zinc-500 line-clamp-1">
                    {signal.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  {signal.merchant_id && (
                    <span className="text-xs text-zinc-400 font-mono">
                      {signal.merchant_id}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-zinc-500">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(signal.timestamp)}
                  </span>
                  <ChevronDown className={cn(
                    'w-4 h-4 text-zinc-400 transition-transform',
                    expandedSignal === signal.id && 'rotate-180'
                  )} />
                </div>
              </button>

              {/* Expanded Signal Details */}
              <AnimatePresence>
                {expandedSignal === signal.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="p-4 space-y-4 surface-subtle">
                      {/* Raw Text */}
                      {signal.raw_text && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Raw Text</p>
                          <div className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 font-mono">
                              {signal.raw_text}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Error Codes */}
                      {signal.error_codes && signal.error_codes.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">Error Codes</p>
                          <div className="flex flex-wrap gap-2">
                            {signal.error_codes.map((code) => (
                              <span key={code} className="px-2 py-1 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono">
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Metadata / Raw Payload */}
                      <div>
                        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                          <Code className="w-3 h-3" />
                          Metadata
                        </p>
                        <pre className="p-3 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto">
                          {JSON.stringify(signal.metadata, null, 2)}
                        </pre>
                      </div>

                      {/* Source System */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-zinc-500">
                            Source: <span className="font-medium text-zinc-700 dark:text-zinc-300">{signal.source}</span>
                          </span>
                          <span className="text-xs text-zinc-500">
                            ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">{signal.id}</span>
                          </span>
                        </div>
                        <button className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline">
                          <ExternalLink className="w-3 h-3" />
                          View in source system
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Empty State */}
      {filteredSignals.length === 0 && (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500">No signals match your filters</p>
        </div>
      )}
    </MainContent>
  );
}
