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
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MainContent, PageHeader } from '@/components/layout';
import { ConfidenceMeter } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { mockDecisions, mockReasoningOutputs } from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function DecisionsPage() {
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [filterApproval, setFilterApproval] = useState<boolean | null>(null);

  // Risk level configuration
  const riskConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    low: { color: 'text-emerald-500', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
    medium: { color: 'text-amber-500', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/20' },
    high: { color: 'text-rose-500', bgColor: 'bg-rose-500/10', borderColor: 'border-rose-500/20' },
  };

  // Action type icons
  const actionTypeIcons: Record<string, typeof Zap> = {
    proactive_message: FileText,
    auto_heal: Zap,
    jira_ticket: FileText,
    escalate: AlertTriangle,
    rollback: Shield,
  };

  // Filter decisions
  const filteredDecisions = mockDecisions.filter((decision) => {
    if (filterRisk && decision.risk !== filterRisk) return false;
    if (filterApproval !== null && decision.requires_human_approval !== filterApproval) return false;
    return true;
  });

  // Get linked reasoning
  const getLinkedReasoning = (reasoningId: string) => {
    return mockReasoningOutputs.find((r) => r.id === reasoningId);
  };

  // Summary stats
  const pendingApprovalCount = mockDecisions.filter((d) => d.requires_human_approval && d.status === 'pending').length;
  const autoApprovedCount = mockDecisions.filter((d) => !d.requires_human_approval).length;
  const highRiskCount = mockDecisions.filter((d) => d.risk === 'high').length;

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
        {filteredDecisions.map((decision) => {
          const risk = riskConfig[decision.risk] || riskConfig.medium;
          const ActionIcon = actionTypeIcons[decision.action_type] || Zap;
          const linkedReasoning = getLinkedReasoning(decision.reasoning_id);

          return (
            <StaggerItem key={decision.id}>
              <motion.div
                whileHover={{ y: -2 }}
                className={cn(
                  'rounded-lg surface-card surface-border p-5',
                  decision.requires_human_approval && decision.status === 'pending'
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
                          {decision.action_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </h3>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', risk.bgColor, risk.color)}>
                          {decision.risk.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
                        {decision.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock className="w-3 h-3" />
                          {formatRelativeTime(decision.created_at)}
                        </span>
                        {linkedReasoning && (
                          <Link
                            href={`/reasoning?id=${decision.reasoning_id}`}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            Based on: {linkedReasoning.primary_hypothesis.title}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <ConfidenceMeter value={decision.confidence} size="sm" />
                    {decision.requires_human_approval ? (
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
                    <p className="text-sm text-zinc-900 dark:text-white">{decision.impact}</p>
                  </div>
                  <div className="p-3 rounded-lg surface-subcard surface-border">
                    <p className="text-xs text-zinc-500 mb-1">Rationale</p>
                    <p className="text-sm text-zinc-900 dark:text-white">{decision.rationale}</p>
                  </div>
                </div>

                {/* Action Footer */}
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span>Decision ID:</span>
                    <code className="px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-800 font-mono">
                      {decision.id}
                    </code>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs',
                      decision.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      decision.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                      decision.status === 'executed' ? 'bg-cyan-500/10 text-cyan-500' :
                      'bg-rose-500/10 text-rose-500'
                    )}>
                      {decision.status}
                    </span>
                  </div>
                  <Link
                    href={`/actions?decision=${decision.id}`}
                    className="flex items-center gap-1 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    View action details
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {/* Empty State */}
      {filteredDecisions.length === 0 && (
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
