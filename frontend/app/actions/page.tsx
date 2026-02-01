'use client';

import { useState } from 'react';
import {
  ShieldCheck,
  Check,
  X,
  Clock,
  FileText,
  Eye,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  History,
  User,
  Bot,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { useApiContext } from '@/lib/api-context';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function ActionsPage() {
  const { pendingActions, useApi, loading, error, approveAction, rejectAction } = useApiContext();
  const [expandedId, setExpandedId] = useState<string | null>(pendingActions[0]?.id || null);
  const [previewArtifact, setPreviewArtifact] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const getLinkedDecision = (decisionId: string) => {
    // try to find a decision in pendingActions or actionHistory metadata if available
    // fallback: undefined
    return undefined;
  };

  const handleApprove = async (actionId: string) => {
    setActioningId(actionId);
    try {
      await approveAction(actionId);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setActioningId(actionId);
    try {
      await rejectAction(actionId);
    } finally {
      setActioningId(null);
    }
  };

  // Status configuration
  const statusConfig: Record<string, { color: string; bgColor: string; icon: typeof Check }> = {
    pending: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', icon: Clock },
    approved: { color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', icon: Check },
    rejected: { color: 'text-rose-500', bgColor: 'bg-rose-500/10', icon: X },
    executed: { color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', icon: X },
  };

  // Stats
  const pendingCount = pendingActions.filter((a) => a.status === 'pending').length;
  const approvedCount = pendingActions.filter((a) => a.status === 'approved' || a.status === 'executed').length;

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
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Guarded Action Layer</span>
          </motion.div>
        </div>
        <PageHeader
          title="Action Review"
          description="Review and approve agent-proposed actions. Preview draft artifacts, view audit trails, and control execution with human-in-the-loop oversight."
        />
      </ScrollReveal>

      {/* Summary Stats */}
      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{pendingCount}</p>
                  <p className="text-xs text-zinc-500">Pending Review</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
                Requires attention
              </span>
            </div>
          </div>
          <div className="p-4 rounded-lg surface-card surface-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Check className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{approvedCount}</p>
                  <p className="text-xs text-zinc-500">Approved Today</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* API status banner */}
      {useApi && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-700 dark:text-emerald-400">
          Connected to backend API • {pendingCount} pending actions
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </div>
      )}
      {loading && (
        <div className="mb-4 text-sm text-foreground-muted">Loading...</div>
      )}

      {/* Action Cards */}
      <StaggerContainer className="space-y-4">
        {pendingActions.map((action) => {
          const isExpanded = expandedId === action.id;
          const status = statusConfig[action.status] || statusConfig.pending;
          const StatusIcon = status.icon;
          const linkedDecision = getLinkedDecision(action.decision_id);

          return (
            <StaggerItem key={action.id}>
              <motion.div
                layout
                className={cn(
                  'rounded-lg surface-card surface-border overflow-hidden',
                  action.status === 'pending'
                    ? 'border-amber-500/30'
                    : 'border-zinc-200 dark:border-zinc-800'
                )}
              >
                {/* Header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : action.id)}
                  className="w-full p-5 flex items-start justify-between text-left hover-surface transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg', status.bgColor)}>
                      <StatusIcon className={cn('w-5 h-5', status.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                          {action.action_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h3>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', status.bgColor, status.color)}>
                          {action.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        {action.reason}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(action.created_at)}
                        </span>
                        {linkedDecision && (
                          <Link
                            href={`/decisions?id=${action.decision_id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            From decision: {String((linkedDecision as any).action_type || (linkedDecision as any).title)}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {action.draft_artifact && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded bg-fuchsia-500/10 text-xs text-fuchsia-600 dark:text-fuchsia-400">
                        <FileText className="w-3 h-3" />
                        Draft ready
                      </span>
                    )}
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
                      <div className="p-5 space-y-6">
                        {/* Action Explanation */}
                        <div className="p-4 rounded-lg surface-subcard surface-border">
                          <div className="flex items-center gap-2 mb-3">
                            <Bot className="w-4 h-4 text-cyan-500" />
                            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                              Action Explanation
                            </span>
                          </div>
                          <p className="text-sm text-zinc-900 dark:text-white">
                            {action.reason}
                          </p>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-zinc-500">Target:</span>
                            <code className="px-2 py-1 rounded bg-zinc-200 dark:bg-zinc-700 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                              {action.target}
                            </code>
                          </div>
                        </div>

                        {/* Content / Draft Artifact Preview */}
                        {(action.draft_artifact || action.description) && (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-fuchsia-500" />
                                Draft Artifact Preview
                              </h4>
                              <button
                                onClick={() => setPreviewArtifact(previewArtifact === action.id ? null : action.id)}
                                className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                              >
                                <Eye className="w-3 h-3" />
                                {previewArtifact === action.id ? 'Hide' : 'Preview'}
                              </button>
                            </div>
                            <div className="p-4 rounded-lg bg-fuchsia-500/5 border border-fuchsia-500/20">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-medium">
                                  {(action.draft_artifact?.type || 'MESSAGE').toUpperCase()}
                                </span>
                                <span className="text-xs text-zinc-500">
                                  Target: {action.draft_artifact?.target || action.target}
                                </span>
                              </div>
                              <AnimatePresence>
                                {previewArtifact === action.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="mt-3"
                                  >
                                    <pre className="p-3 rounded bg-zinc-900 text-zinc-100 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                                      {action.draft_artifact?.content || action.description || action.reason}
                                    </pre>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}

                        {/* Audit Trail */}
                        {action.audit_trail && action.audit_trail.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                              <History className="w-4 h-4 text-zinc-400" />
                              Audit Trail
                            </h4>
                            <div className="space-y-2">
                              {action.audit_trail.map((entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-start gap-3 p-3 rounded-lg surface-subcard surface-border"
                                >
                                  <div className={cn(
                                    'p-1.5 rounded-full',
                                    entry.actor_type === 'human' ? 'bg-amber-500/10' : 'bg-cyan-500/10'
                                  )}>
                                    {entry.actor_type === 'human' ? (
                                      <User className="w-3 h-3 text-amber-500" />
                                    ) : (
                                      <Bot className="w-3 h-3 text-cyan-500" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-zinc-900 dark:text-white">
                                        {entry.actor}
                                      </span>
                                      <span className="text-xs text-zinc-500">
                                        {formatRelativeTime(entry.timestamp)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                      {entry.action}: {entry.details}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Approval Controls */}
                        {action.status === 'pending' && (
                          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-500" />
                                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                                  This action requires human approval before execution
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReject(action.id)}
                                  disabled={actioningId === action.id}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                  {actioningId === action.id ? 'Rejecting...' : 'Reject'}
                                </button>
                                <button
                                  onClick={() => handleApprove(action.id)}
                                  disabled={actioningId === action.id}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors text-sm font-medium disabled:opacity-50"
                                >
                                  <Check className="w-4 h-4" />
                                  {actioningId === action.id ? 'Approving...' : 'Approve & Execute'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Footer */}
                        <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-zinc-500">
                            <span>Action ID:</span>
                            <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
                              {action.id}
                            </code>
                          </div>
                          <Link
                            href={`/docs?action=${action.id}`}
                            className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            View related docs
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
      {pendingActions.length === 0 && (
        <ScrollReveal>
          <div className="rounded-lg surface-card surface-border p-12 text-center">
            <ShieldCheck className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No pending actions</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              Actions requiring review will appear here once decisions are made by the agent.
            </p>
          </div>
        </ScrollReveal>
      )}
    </MainContent>
  );
}
