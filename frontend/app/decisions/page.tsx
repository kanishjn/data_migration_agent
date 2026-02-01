'use client';

import { useState } from 'react';
import {
  Scale,
  AlertTriangle,
  CheckCircle,
  Shield,
  Clock,
  ArrowRight,
  User,
  Zap,
  FileText,
  ExternalLink,
  RefreshCw,
  Wifi,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ConfidenceMeter } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
// decisions and reasoning outputs are provided by the backend via ApiContext
import { useApiContext } from '@/lib/api-context';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { AgentAction, RiskLevel } from '@/types';

export default function DecisionsPage() {
  const { pendingActions, actionHistory, useApi, loading, refresh, approveAction, rejectAction } = useApiContext();
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [filterApproval, setFilterApproval] = useState<boolean | null>(null);
  const [processingActions, setProcessingActions] = useState<Set<string>>(new Set());

  // Risk level configuration
  const riskConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    low: { color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    medium: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
    high: { color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
    critical: { color: 'text-rose-600', bgColor: 'bg-rose-600/10', borderColor: 'border-rose-600/20' },
  };

  // Action type icons
  const actionTypeIcons: Record<string, typeof Zap> = {
    proactive_message: FileText,
    proactive_merchant_message: FileText,
    auto_heal: Zap,
    jira_ticket: FileText,
    escalate: AlertTriangle,
    rollback: Shield,
    notify: FileText,
    investigate: AlertTriangle,
  };

  // Combine API actions or use mock data
  const allActions = useApi ? [...pendingActions, ...actionHistory] : [];
  const displayActions: AgentAction[] = allActions;

  // Filter decisions
  const filteredActions = displayActions.filter((action) => {
    const risk = action.riskLevel || 'medium';
    if (filterRisk && risk !== filterRisk) return false;
    if (filterApproval !== null && action.requiresApproval !== filterApproval) return false;
    return true;
  });

  // Get linked reasoning
  const getLinkedReasoning = (reasoningId: string) => undefined;

  // Summary stats
  const pendingApprovalCount = displayActions.filter((a) => a.requiresApproval && a.status === 'pending').length;
  const autoApprovedCount = displayActions.filter((a) => !a.requiresApproval).length;
  const highRiskCount = displayActions.filter((a) => a.riskLevel === 'high' || a.riskLevel === 'critical').length;

  // Handle approve/reject
  const handleApprove = async (actionId: string) => {
    setProcessingActions(prev => new Set(prev).add(actionId));
    try {
      await approveAction(actionId);
    } finally {
      setProcessingActions(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
  };

  const handleReject = async (actionId: string) => {
    setProcessingActions(prev => new Set(prev).add(actionId));
    try {
      await rejectAction(actionId);
    } finally {
      setProcessingActions(prev => {
        const next = new Set(prev);
        next.delete(actionId);
        return next;
      });
    }
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
            <Scale className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Decision Engine</span>
          </motion.div>
        </div>
        <PageHeader
          title="Decisions"
          description="Agent-proposed actions with risk assessment and approval requirements. The decision engine evaluates reasoning outputs to determine recommended actions."
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
              Connected to backend • {pendingActions.length} pending actions
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

      {/* Summary Stats */}
      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg surface-card surface-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <User className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{pendingApprovalCount}</p>
                <p className="text-xs text-zinc-500">Pending Approval</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg surface-card surface-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{autoApprovedCount}</p>
                <p className="text-xs text-zinc-500">Auto-Approved</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg surface-card surface-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/10">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-zinc-900 dark:text-white">{highRiskCount}</p>
                <p className="text-xs text-zinc-500">High Risk</p>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Filters */}
      <ScrollReveal delay={0.15}>
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Risk:</span>
            {['low', 'medium', 'high'].map((risk) => (
              <button
                key={risk}
                onClick={() => setFilterRisk(filterRisk === risk ? null : risk)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  filterRisk === risk
                    ? `${riskConfig[risk].bgColor} ${riskConfig[risk].color} ${riskConfig[risk].borderColor} border`
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover-surface'
                )}
              >
                {risk.charAt(0).toUpperCase() + risk.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Approval:</span>
            <button
              onClick={() => setFilterApproval(filterApproval === true ? null : true)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filterApproval === true
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover-surface'
              )}
            >
              Needs Approval
            </button>
            <button
              onClick={() => setFilterApproval(filterApproval === false ? null : false)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                filterApproval === false
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover-surface'
              )}
            >
              Auto-Approved
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* Decision Cards */}
      <StaggerContainer className="space-y-4">
        {filteredActions.map((action) => {
          const riskLevel = action.riskLevel || 'medium';
          const risk = riskConfig[riskLevel] || riskConfig.medium;
          const actionType = action.action_type || action.type || 'notify';
          const ActionIcon = actionTypeIcons[actionType] || Zap;
          const isProcessing = processingActions.has(action.id);

          return (
            <StaggerItem key={action.id}>
              <motion.div
                whileHover={{ y: -2 }}
                className={cn(
                  'rounded-lg surface-card surface-border p-5',
                  action.requiresApproval && action.status === 'pending'
                    ? 'border-amber-500/30'
                    : 'border-zinc-200 dark:border-zinc-800'
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className={cn('p-2 rounded-lg', risk.bgColor)}>
                      <ActionIcon className={cn('w-5 h-5', risk.color)} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-medium text-zinc-900 dark:text-white">
                          {action.title || actionType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </h3>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', risk.bgColor, risk.color)}>
                          {riskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        {action.description || action.reason}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(action.created_at)}
                        </span>
                        {action.target && (
                          <span className="text-xs text-zinc-500">
                            Target: {action.target}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {action.requiresApproval ? (
                      <span className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
                        <User className="w-3 h-3" />
                        Human Approval Required
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 text-xs text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        Auto-Approved
                      </span>
                    )}
                  </div>
                </div>

                {/* Impact & Rationale */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="p-3 rounded-lg surface-subcard surface-border">
                    <p className="text-xs text-zinc-500 mb-1">Expected Impact</p>
                    <p className="text-sm text-zinc-900 dark:text-white">{action.estimatedImpact || 'N/A'}</p>
                  </div>
                  <div className="p-3 rounded-lg surface-subcard surface-border">
                    <p className="text-xs text-zinc-500 mb-1">Reason</p>
                    <p className="text-sm text-zinc-900 dark:text-white">{action.reason || action.description || 'N/A'}</p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>Action ID:</span>
                    <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
                      {action.id}
                    </code>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs',
                      action.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      action.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      action.status === 'executed' ? 'bg-cyan-500/10 text-cyan-500' :
                      'bg-rose-500/10 text-rose-500'
                    )}>
                      {action.status}
                    </span>
                  </div>
                  
                  {/* Approve/Reject buttons for pending actions */}
                  {action.status === 'pending' && action.requiresApproval && useApi && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleReject(action.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                      <button
                        onClick={() => handleApprove(action.id)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approve & Execute
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Empty State */}
      {filteredActions.length === 0 && (
        <ScrollReveal>
          <div className="rounded-lg surface-card surface-border p-12 text-center">
            <Scale className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-2">No decisions found</h3>
            <p className="text-sm text-zinc-500 max-w-md mx-auto">
              {filterRisk || filterApproval !== null
                ? 'Try adjusting your filters to see more decisions.'
                : 'Decisions will appear here once the agent generates recommendations based on reasoning outputs.'}
            </p>
          </div>
        </ScrollReveal>
      )}
    </MainContent>
  );
}
