'use client';

import dynamic from 'next/dynamic';
import { Eye, Brain, Scale, Zap, Clock, TrendingUp, Activity } from 'lucide-react';
import { MainContent, PageHeader } from '@/components/layout';
import { GlassCard, ConfidenceMeter } from '@/components/ui';
import { ScrollReveal, StaggerContainer, StaggerItem } from '@/components/motion';
import { useApp } from '@/lib/app-context';
import { formatRelativeTime } from '@/lib/utils';

// Dynamically import Three.js component
const AgentFlowCanvas = dynamic(
  () => import('@/components/three/agent-flow-canvas').then((mod) => mod.AgentFlowCanvas),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center text-foreground-muted">Loading visualization...</div> }
);

export default function AgentPage() {
  const { agentLoop, incidents } = useApp();

  const stats = [
    {
      label: 'Current State',
      value: agentLoop.currentState,
      icon: Brain,
      description: 'Agent is actively analyzing signals',
    },
    {
      label: 'Observations Today',
      value: agentLoop.observationsCount.toString(),
      icon: Eye,
      description: 'Signals processed and correlated',
    },
    {
      label: 'Reasoning Cycles',
      value: agentLoop.reasoningCycles.toString(),
      icon: Activity,
      description: 'Hypothesis generation runs',
    },
    {
      label: 'Decisions Made',
      value: agentLoop.decisionsToday.toString(),
      icon: Scale,
      description: 'Actions recommended today',
    },
    {
      label: 'Actions Executed',
      value: agentLoop.actionsToday.toString(),
      icon: Zap,
      description: 'Auto-healing operations',
    },
  ];

  const recentActions = incidents
    .flatMap((i) => i.actions.filter((a) => a.status === 'executed'))
    .sort((a, b) => new Date(b.executed_at || 0).getTime() - new Date(a.executed_at || 0).getTime())
    .slice(0, 5);

  return (
    <MainContent>
      <ScrollReveal>
        <PageHeader
          title="Agent Insights"
          description="Understand how the AI agent observes, reasons, decides, and acts on your behalf. This page provides transparency into the agent's decision-making process."
        />
      </ScrollReveal>

      {/* Agent Flow Visualization */}
      <ScrollReveal delay={0.1} className="mb-10">
        <GlassCard elevated padding="lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Agent Loop Visualization</h2>
              <p className="text-sm text-foreground-muted mt-1">
                The agent continuously cycles through observe → reason → decide → act
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm text-foreground-muted">
                Last state change: {formatRelativeTime(agentLoop.lastStateChange)}
              </span>
            </div>
          </div>

          {/* Three.js Canvas for Agent Flow */}
          <div className="h-64 rounded-xl overflow-hidden bg-foreground/5">
            <AgentFlowCanvas activeState={agentLoop.currentState} className="w-full h-full" />
          </div>

          {/* Loop State Legend */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[
              { state: 'observe', label: 'Observe', description: 'Collect signals from all sources', color: 'bg-blue-500' },
              { state: 'reason', label: 'Reason', description: 'Generate and evaluate hypotheses', color: 'bg-purple-500' },
              { state: 'decide', label: 'Decide', description: 'Select best action based on policy', color: 'bg-pink-500' },
              { state: 'act', label: 'Act', description: 'Execute approved actions', color: 'bg-emerald-500' },
            ].map((item) => (
              <div
                key={item.state}
                className={`p-3 rounded-xl border ${
                  agentLoop.currentState === item.state
                    ? 'border-accent bg-accent/5'
                    : 'border-surface-border'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="font-medium text-sm text-foreground">{item.label}</span>
                </div>
                <p className="text-xs text-foreground-muted">{item.description}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </ScrollReveal>

      {/* Stats Grid */}
      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {stats.map((stat) => (
          <StaggerItem key={stat.label}>
            <GlassCard className="h-full">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <stat.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-xs text-foreground-muted">{stat.label}</p>
                  <p className="text-xl font-semibold text-foreground capitalize">{stat.value}</p>
                  <p className="text-xs text-foreground-muted mt-1">{stat.description}</p>
                </div>
              </div>
            </GlassCard>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Auto-Heal Performance & Recent Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ScrollReveal delay={0.2}>
          <GlassCard elevated padding="lg" className="h-full">
            <h2 className="text-lg font-semibold text-foreground mb-6">Auto-Heal Performance</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-foreground-muted">Overall Auto-Heal Rate</span>
                  <span className="text-2xl font-semibold text-foreground">{agentLoop.autoHealRate}%</span>
                </div>
                <ConfidenceMeter value={agentLoop.autoHealRate} size="lg" showLabel={false} />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                  <span className="text-sm text-foreground-secondary">Issues auto-resolved</span>
                  <span className="font-semibold text-emerald-500">847</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                  <span className="text-sm text-foreground-secondary">Escalated to humans</span>
                  <span className="font-semibold text-amber-500">312</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-foreground/5">
                  <span className="text-sm text-foreground-secondary">Avg. resolution time</span>
                  <span className="font-semibold text-foreground">2.3 min</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-emerald-500">
                <TrendingUp className="w-4 h-4" />
                <span>+12% improvement this month</span>
              </div>
            </div>
          </GlassCard>
        </ScrollReveal>

        <ScrollReveal delay={0.3}>
          <GlassCard elevated padding="lg" className="h-full">
            <h2 className="text-lg font-semibold text-foreground mb-6">Recent Agent Actions</h2>
            
            <div className="space-y-4">
              {recentActions.length === 0 ? (
                <p className="text-foreground-muted text-center py-8">No recent actions</p>
              ) : (
                recentActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-foreground/5"
                  >
                    <div className="p-1.5 rounded-lg bg-emerald-500/10">
                      <Zap className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{action.title}</p>
                      <p className="text-xs text-foreground-muted mt-0.5">
                        {action.type} • {action.executed_at && formatRelativeTime(action.executed_at)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </ScrollReveal>
      </div>
    </MainContent>
  );
}
