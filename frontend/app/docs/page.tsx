'use client';

import { useState } from 'react';
import {
  BookOpen,
  AlertCircle,
  FileText,
  Plus,
  Check,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ThumbsUp,
  ThumbsDown,
  Edit3,
  Lightbulb,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { mockKnownIssues, mockSuggestedDocUpdates } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function DocsPage() {
  const [activeTab, setActiveTab] = useState<'issues' | 'updates'>('issues');
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [expandedUpdate, setExpandedUpdate] = useState<string | null>(null);

  // Status configuration for known issues
  const issueStatusConfig: Record<string, { color: string; bgColor: string }> = {
    active: { color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
    resolved: { color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    investigating: { color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  };

  // Status configuration for doc updates
  const updateStatusConfig: Record<string, { color: string; bgColor: string }> = {
    pending: { color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    approved: { color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
    rejected: { color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  };

  // Severity configuration
  const severityConfig: Record<string, { color: string; bgColor: string }> = {
    critical: { color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
    high: { color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    medium: { color: 'text-cyan-500', bgColor: 'bg-cyan-500/10' },
    low: { color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  };

  // Stats
  const activeIssuesCount = mockKnownIssues.filter((i) => i.status === 'active').length;
  const pendingUpdatesCount = mockSuggestedDocUpdates.filter((u) => u.status === 'pending').length;

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
            <BookOpen className="w-4 h-4 text-fuchsia-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Knowledge Layer</span>
          </motion.div>
        </div>
        <PageHeader
          title="Docs & Learnings"
          description="Known issues from past incidents and suggested documentation updates from agent learnings. Captures institutional knowledge to improve future responses."
        />
      </ScrollReveal>

      {/* Tab Navigation */}
      <ScrollReveal delay={0.1}>
        <div className="flex items-center gap-2 mb-6 p-1 rounded-lg surface-pill surface-border w-fit">
          <button
            onClick={() => setActiveTab('issues')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'issues'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <AlertCircle className="w-4 h-4" />
            Known Issues
            {activeIssuesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-rose-500/10 text-rose-500">
                {activeIssuesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('updates')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'updates'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            )}
          >
            <Edit3 className="w-4 h-4" />
            Suggested Updates
            {pendingUpdatesCount > 0 && (
              <span className="px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-500">
                {pendingUpdatesCount}
              </span>
            )}
          </button>
        </div>
      </ScrollReveal>

      {/* Known Issues Tab */}
      {activeTab === 'issues' && (
        <StaggerContainer className="space-y-4">
          {mockKnownIssues.map((issue) => {
            const isExpanded = expandedIssue === issue.id;
            const status = issueStatusConfig[issue.status] || issueStatusConfig.active;
            const severity = severityConfig[issue.severity] || severityConfig.medium;

            return (
              <StaggerItem key={issue.id}>
                <motion.div
                  layout
                  className="rounded-lg surface-card surface-border overflow-hidden"
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedIssue(isExpanded ? null : issue.id)}
                    className="w-full p-5 flex items-start justify-between text-left hover-surface transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className={cn('p-2 rounded-lg', status.bgColor)}>
                        <AlertCircle className={cn('w-5 h-5', status.color)} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                            {issue.title}
                          </h3>
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', status.bgColor, status.color)}>
                            {issue.status.toUpperCase()}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', severity.bgColor, severity.color)}>
                            {issue.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {issue.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(issue.created_at)}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Affected: {issue.affected_merchants} merchants
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400" />
                      )}
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
                        <div className="p-5 space-y-4">
                          {/* Root Cause */}
                          <div className="p-4 rounded-lg surface-subcard surface-border">
                            <p className="text-xs text-zinc-500 mb-1">Root Cause</p>
                            <p className="text-sm text-zinc-900 dark:text-white">{issue.root_cause}</p>
                          </div>

                          {/* Resolution / Workaround */}
                          <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1">
                              {issue.status === 'resolved' ? 'Resolution' : 'Workaround'}
                            </p>
                            <p className="text-sm text-zinc-900 dark:text-white">{issue.resolution}</p>
                          </div>

                          {/* Related Signals */}
                          {issue.related_signals && issue.related_signals.length > 0 && (
                            <div>
                              <p className="text-xs text-zinc-500 mb-2">Related Signals</p>
                              <div className="flex flex-wrap gap-2">
                                {issue.related_signals.map((signalId) => (
                                  <Link
                                    key={signalId}
                                    href={`/signals?id=${signalId}`}
                                    className="px-2 py-1 rounded bg-cyan-500/10 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors font-mono"
                                  >
                                    {signalId}
                                  </Link>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                            <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-500">
                              {issue.id}
                            </code>
                            <a
                              href="#"
                              className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              View in knowledge base
                              <ExternalLink className="w-3 h-3" />
                            </a>
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
      )}

      {/* Suggested Updates Tab */}
      {activeTab === 'updates' && (
        <StaggerContainer className="space-y-4">
          {mockSuggestedDocUpdates.map((update) => {
            const isExpanded = expandedUpdate === update.id;
            const status = updateStatusConfig[update.status] || updateStatusConfig.pending;

            return (
              <StaggerItem key={update.id}>
                <motion.div
                  layout
                  className={cn(
                    'rounded-lg surface-card surface-border overflow-hidden',
                    update.status === 'pending'
                      ? 'border-amber-500/30'
                      : 'border-zinc-200 dark:border-zinc-800'
                  )}
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedUpdate(isExpanded ? null : update.id)}
                    className="w-full p-5 flex items-start justify-between text-left hover-surface transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-lg bg-fuchsia-500/10">
                        <Lightbulb className="w-5 h-5 text-fuchsia-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                            {update.title}
                          </h3>
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', status.bgColor, status.color)}>
                            {update.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {update.summary}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            {formatRelativeTime(update.created_at)}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Target: {update.target_doc}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400" />
                      )}
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
                        <div className="p-5 space-y-4">
                          {/* Suggested Content */}
                          <div>
                            <p className="text-xs text-zinc-500 mb-2">Suggested Addition</p>
                            <div className="p-4 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20">
                              <pre className="text-sm text-zinc-900 dark:text-white whitespace-pre-wrap font-sans">
                                {update.suggested_content}
                              </pre>
                            </div>
                          </div>

                          {/* Source Context */}
                          <div className="p-4 rounded-lg surface-subcard surface-border">
                            <p className="text-xs text-zinc-500 mb-1">Source Context</p>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300">{update.source_context}</p>
                          </div>

                          {/* Related Action */}
                          {update.related_action_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-500">Derived from action:</span>
                              <Link
                                href={`/actions?id=${update.related_action_id}`}
                                className="px-2 py-1 rounded bg-cyan-500/10 text-xs text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 transition-colors font-mono"
                              >
                                {update.related_action_id}
                              </Link>
                            </div>
                          )}

                          {/* Approval Controls */}
                          {update.status === 'pending' && (
                            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                  Review this suggested documentation update
                                </span>
                                <div className="flex items-center gap-2">
                                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors text-sm">
                                    <ThumbsDown className="w-4 h-4" />
                                    Reject
                                  </button>
                                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm">
                                    <ThumbsUp className="w-4 h-4" />
                                    Approve
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Footer */}
                          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                            <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-zinc-500">
                              {update.id}
                            </code>
                            <a
                              href="#"
                              className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                            >
                              Open target doc
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </StaggerItem>
            );
          })}

          {/* Empty State for Updates */}
          {mockSuggestedDocUpdates.length === 0 && (
            <ScrollReveal>
              <div className="rounded-lg surface-card surface-border p-12 text-center">
                <Edit3 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No suggested updates</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Documentation suggestions from agent learnings will appear here.
                </p>
              </div>
            </ScrollReveal>
          )}
        </StaggerContainer>
      )}

      {/* Empty State for Issues */}
      {activeTab === 'issues' && mockKnownIssues.length === 0 && (
        <ScrollReveal>
          <div className="rounded-lg surface-card surface-border p-12 text-center">
            <AlertCircle className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No known issues</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Known issues from past incidents will be documented here for future reference.
            </p>
          </div>
        </ScrollReveal>
      )}
    </MainContent>
  );
}
