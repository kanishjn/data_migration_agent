"use client";

import { useState } from 'react';
import {
  Brain,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  FileText,
  Clock,
  RefreshCw,
  Wifi,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ConfidenceMeter } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { useApiContext } from '@/lib/api-context';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ReasoningPage() {
  const { incidents = [], patterns = [], useApi, loading, refresh } = useApiContext();

  // Transform incidents with hypotheses to reasoning outputs
  const reasoningOutputs = (useApi ? incidents : [])
    .filter((inc: any) => inc.hypotheses && inc.hypotheses.length > 0)
    .map((inc: any) => ({
      id: `reasoning-${inc.id}`,
      pattern_id: inc.pattern_id || `pattern-${inc.id}`,
      created_at: inc.createdAt || inc.created_at || new Date().toISOString(),
      primary_hypothesis: inc.hypotheses[0],
      alternative_hypotheses: inc.hypotheses.slice(1) || [],
      unknowns: inc.unknowns || [],
      assumptions: inc.assumptions || [],
      confidence: inc.hypotheses[0]?.confidence || 0,
    }));

  const [expandedId, setExpandedId] = useState<string | null>(reasoningOutputs[0]?.id || null);

  // Patterns available from ApiContext
  const displayPatterns = useApi ? patterns : [];
  const getLinkedPattern = (patternId: string) => displayPatterns.find((p: any) => p.id === patternId);

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
            <Brain className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">LLM Reasoning Layer</span>
          </motion.div>
        </div>
        <PageHeader
          title="Reasoning"
          description="LLM-generated hypotheses with structured analysis. Shows primary hypothesis, alternatives, unknowns, and assumptions — all traceable back to patterns."
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
              Connected to backend • {reasoningOutputs.length} reasoning outputs
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

      {/* Reasoning Cards */}
      <StaggerContainer className="space-y-4">
        {reasoningOutputs.map((reasoning: any) => {
          const isExpanded = expandedId === reasoning.id;
          const linkedPattern = getLinkedPattern(reasoning.pattern_id);

          return (
            <StaggerItem key={reasoning.id}>
              <motion.div layout className="rounded-lg surface-card surface-border overflow-hidden">
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : reasoning.id)}
                  className="w-full p-5 flex items-start justify-between text-left hover-surface transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-zinc-900 dark:text-white mb-1">
                        {reasoning.primary_hypothesis?.title}
                      </h3>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                        {reasoning.primary_hypothesis?.explanation || reasoning.primary_hypothesis?.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(reasoning.created_at)}
                        </span>
                        <Link
                          href={`/patterns?id=${reasoning.pattern_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                        >
                          From pattern: {linkedPattern?.common_error || reasoning.pattern_id}
                        </Link>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ConfidenceMeter value={reasoning.primary_hypothesis?.confidence || 0} size="sm" />
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
                  </div>
                </button>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="p-5 space-y-6">
                        {/* Primary Hypothesis */}
                        <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-amber-500" />
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Primary Hypothesis</span>
                          </div>
                          <h4 className="text-base font-medium text-zinc-900 dark:text-white mb-2">{reasoning.primary_hypothesis?.title}</h4>
                          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{reasoning.primary_hypothesis?.explanation}</p>
                          <div className="flex items-center gap-3">
                            <ConfidenceMeter value={reasoning.primary_hypothesis?.confidence || 0} size="md" />
                          </div>
                        </div>

                        {/* Evidence Summary */}
                        <div>
                          <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-zinc-400" />
                            Evidence Summary
                          </h4>
                          <div className="p-4 rounded-lg surface-subcard surface-border">
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{String((reasoning as any).evidence_summary || reasoning.primary_hypothesis?.description || '')}</p>
                          </div>
                        </div>

                        {/* Alternative Hypotheses */}
                        {reasoning.alternative_hypotheses && reasoning.alternative_hypotheses.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-zinc-400" />
                              Alternative Hypotheses
                            </h4>
                            <div className="space-y-2">
                              {reasoning.alternative_hypotheses.map((alt: any, index: number) => (
                                <div key={index} className="p-3 rounded-lg surface-subcard surface-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <h5 className="text-sm font-medium text-zinc-900 dark:text-white">{alt.title}</h5>
                                    <span className="text-xs text-zinc-500">{alt.confidence}% confidence</span>
                                  </div>
                                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-2">{alt.explanation || alt.description}</p>
                                  {(alt as any).why_less_likely && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-amber-600 dark:text-amber-400">Why less likely:</span>
                                      <span className="text-xs text-zinc-500">{String((alt as any).why_less_likely)}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Unknowns & Assumptions */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-fuchsia-500" />
                              Unknowns
                            </h4>
                            <div className="space-y-2">
                              {(reasoning.unknowns || []).map((unknown: any, index: number) => (
                                <div key={index} className="flex items-start gap-2 p-2 rounded bg-fuchsia-500/5 border border-fuchsia-500/10">
                                  <HelpCircle className="w-3.5 h-3.5 text-fuchsia-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{unknown}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-500" />
                              Assumptions
                            </h4>
                            <div className="space-y-2">
                              {(reasoning.assumptions || []).map((assumption: any, index: number) => (
                                <div key={index} className="flex items-start gap-2 p-2 rounded bg-amber-500/5 border border-amber-500/10">
                                  <CheckCircle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-zinc-700 dark:text-zinc-300">{assumption}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Action Link */}
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>Reasoning ID:</span>
                            <code className="px-2 py-1 rounded surface-subcard font-mono">{reasoning.id}</code>
                          </div>
                          <Link href={`/decisions?reasoning=${reasoning.id}`} className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:underline">
                            View related decisions
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Empty State */}
      {reasoningOutputs.length === 0 && (
        <ScrollReveal>
          <div className="rounded-lg surface-card surface-border p-12 text-center">
            <Brain className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No reasoning outputs</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">The reasoning layer hasn't produced outputs yet. Connect backend or run an agent cycle.</p>
          </div>
        </ScrollReveal>
      )}

      {/* Reasoning History */}
      <ScrollReveal delay={0.2} className="mt-6">
        <div className="rounded-lg surface-card surface-border p-5">
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white mb-4">Reasoning History</h3>
          <div className="space-y-3">
            {reasoningOutputs.slice(0, 5).map((r: any, index: number) => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg hover-surface transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                    r.primary_hypothesis?.confidence >= 70
                      ? 'bg-emerald-500/10 text-emerald-500'
                      : r.primary_hypothesis?.confidence >= 50
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-rose-500/10 text-rose-500'
                  )}>{index + 1}</div>
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">{r.primary_hypothesis?.title}</p>
                    <p className="text-xs text-zinc-500">{formatRelativeTime(r.created_at)} • {r.primary_hypothesis?.confidence}% confidence</p>
                  </div>
                </div>
                <button onClick={() => setExpandedId(r.id)} className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline">View</button>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </MainContent>
  );
}
