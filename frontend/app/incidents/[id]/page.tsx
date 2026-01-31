'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  User,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { MainContent } from '@/components/layout';
import {
  GlassCard,
  SeverityBadge,
  StatusBadge,
  ConfidenceMeter,
  RiskBanner,
  CollapsibleSection,
  Button,
} from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { useApp } from '@/lib/app-context';
import { formatDate, formatRelativeTime, cn, getRiskColor } from '@/lib/utils';
import type { Hypothesis, AgentAction } from '@/types';

export default function IncidentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { incidents } = useApp();

  const incident = incidents.find((i) => i.id === params.id);
  const [selectedHypothesis, setSelectedHypothesis] = useState<string | null>(
    incident?.hypotheses.find((h) => h.isSelected)?.id || null
  );

  if (!incident) {
    return (
      <MainContent>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle className="w-16 h-16 text-foreground-muted mb-4" />
          <h1 className="text-xl font-semibold text-foreground">Incident not found</h1>
          <p className="text-foreground-muted mt-2">The incident you're looking for doesn't exist.</p>
          <Button onClick={() => router.push('/incidents')} className="mt-6">
            Back to Incidents
          </Button>
        </div>
      </MainContent>
    );
  }

  const selectedHyp = incident.hypotheses.find((h) => h.id === selectedHypothesis);

  return (
    <MainContent>
      {/* Back Button & Header */}
      <ScrollReveal>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-foreground-muted hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Incidents
        </button>

        <div className="flex flex-col lg:flex-row lg:items-start gap-4 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">{incident.title}</h1>
            <p className="text-foreground-muted mt-2">{incident.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-foreground-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Created {formatRelativeTime(incident.createdAt)}
              </span>
              <span>•</span>
              <span>Updated {formatRelativeTime(incident.updatedAt)}</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* High Risk Warning */}
      {incident.severity === 'critical' && incident.status !== 'resolved' && (
        <ScrollReveal delay={0.1} className="mb-6">
          <RiskBanner
            riskLevel="critical"
            title="Critical Incident - Immediate Attention Required"
            description="This incident is affecting production systems. The agent has identified potential mitigations."
          />
        </ScrollReveal>
      )}

      {/* Three Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT - Signals */}
        <ScrollReveal delay={0.1}>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Signals ({incident.signals.length})</h2>
            <div className="space-y-3">
              {incident.signals.map((signal) => (
                <CollapsibleSection
                  key={signal.id}
                  title={signal.title}
                  icon={<SeverityBadge severity={signal.severity} size="sm" showDot={false} />}
                  defaultOpen={false}
                >
                  <div className="space-y-3">
                    <p className="text-sm text-foreground-secondary">{signal.description}</p>
                    <div className="flex items-center gap-2 text-xs text-foreground-muted">
                      <span className="px-2 py-0.5 rounded bg-foreground/5">{signal.source}</span>
                      <span>{formatDate(signal.timestamp)}</span>
                    </div>
                    {signal.metadata && (
                      <div className="p-3 rounded-lg bg-foreground/5 font-mono text-xs text-foreground-secondary">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(signal.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* CENTER - Agent Reasoning */}
        <ScrollReveal delay={0.2}>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Agent Reasoning</h2>
            <p className="text-sm text-foreground-muted">
              The agent has identified {incident.hypotheses.length} possible root causes. Select one to see suggested actions.
            </p>

            <StaggerContainer className="space-y-3">
              {incident.hypotheses.map((hypothesis) => (
                <StaggerItem key={hypothesis.id}>
                  <HypothesisCard
                    hypothesis={hypothesis}
                    isSelected={selectedHypothesis === hypothesis.id}
                    onSelect={() => setSelectedHypothesis(hypothesis.id)}
                  />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Selected Hypothesis Details */}
            <AnimatePresence mode="wait">
              {selectedHyp && (
                <motion.div
                  key={selectedHyp.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard elevated className="mt-4">
                    <h3 className="font-semibold text-foreground mb-3">Evidence</h3>
                    <ul className="space-y-2">
                      {selectedHyp.evidence.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-foreground-secondary">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollReveal>

        {/* RIGHT - Actions */}
        <ScrollReveal delay={0.3}>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Actions</h2>
            <p className="text-sm text-foreground-muted">
              Recommended and executed actions for this incident.
            </p>

            <StaggerContainer className="space-y-3">
              {incident.actions.map((action, index) => (
                <StaggerItem key={action.id}>
                  <ActionCard action={action} delay={index * 0.1} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </ScrollReveal>
      </div>
    </MainContent>
  );
}

// Hypothesis Card Component
function HypothesisCard({
  hypothesis,
  isSelected,
  onSelect,
}: {
  hypothesis: Hypothesis;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 rounded-xl border transition-all duration-200',
        isSelected
          ? 'bg-accent/10 border-accent/30'
          : 'bg-surface border-surface-border hover:bg-foreground/5'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground">{hypothesis.title}</h3>
          <p className="text-sm text-foreground-muted mt-1 line-clamp-2">
            {hypothesis.description}
          </p>
        </div>
        <ChevronRight
          className={cn(
            'w-5 h-5 text-foreground-muted flex-shrink-0 transition-transform',
            isSelected && 'rotate-90'
          )}
        />
      </div>
      <div className="mt-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-foreground-muted">Confidence:</span>
          <ConfidenceMeter value={hypothesis.confidence} size="sm" />
        </div>
      </div>
    </button>
  );
}

// Action Card Component
function ActionCard({ action, delay }: { action: AgentAction; delay: number }) {
  const getStatusIcon = () => {
    switch (action.status) {
      case 'executed':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Zap className="w-5 h-5 text-foreground-muted" />;
    }
  };

  const isHighRisk = action.riskLevel === 'high' || action.riskLevel === 'critical';

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: isHighRisk ? delay + 0.2 : delay, ease: 'easeOut' }}
    >
      <GlassCard
        className={cn(
          'border-l-4',
          action.riskLevel === 'critical' && 'border-l-red-500',
          action.riskLevel === 'high' && 'border-l-orange-500',
          action.riskLevel === 'medium' && 'border-l-amber-500',
          action.riskLevel === 'low' && 'border-l-emerald-500'
        )}
      >
        <div className="flex items-start gap-3">
          {getStatusIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground">{action.title}</h3>
              <span
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  getRiskColor(action.riskLevel)
                )}
              >
                {action.riskLevel}
              </span>
            </div>
            <p className="text-sm text-foreground-muted mt-1">{action.description}</p>
            <p className="text-xs text-foreground-muted mt-2">
              Impact: {action.estimatedImpact}
            </p>

            {action.status === 'executed' && action.executed_at && (
              <div className="flex items-center gap-2 mt-3 text-xs text-foreground-muted">
                <User className="w-3 h-3" />
                <span>
                  Executed by {action.executed_by} • {formatRelativeTime(action.executed_at)}
                </span>
              </div>
            )}

            {action.status === 'pending' && action.requiresApproval && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="primary">
                  Approve
                </Button>
                <Button size="sm" variant="ghost">
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
