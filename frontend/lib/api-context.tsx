'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Incident, AgentLoop, AgentAction, Pattern, SystemHealth } from '@/types';
import { api, isApiAvailable, type ApiIncident, type ApiAction, type ApiPattern, type ApiHealth, type ApiEvent } from './api';

// Map backend incident to frontend Incident shape
function mapApiIncidentToIncident(apiInc: ApiIncident): Incident {
  const hyp = apiInc.reasoning?.primary_hypothesis;
  const confidence = (hyp?.confidence ?? apiInc.confidence ?? 0) * 100;
  const actionsTaken = Array.isArray(apiInc.action_taken) ? apiInc.action_taken : [];
  
  return {
    id: String(apiInc.id),
    title: apiInc.root_cause || apiInc.signal_cluster || 'Incident',
    description: apiInc.pattern_summary || apiInc.signal_cluster || '',
    severity: confidence > 70 ? 'high' : confidence > 40 ? 'medium' : 'low',
    status: apiInc.outcome === 'completed' ? 'resolved' : 'investigating',
    createdAt: apiInc.created_at,
    updatedAt: apiInc.created_at,
    signals: [],
    hypotheses: hyp
      ? [
          {
            id: 'hyp-1',
            title: hyp.cause || 'Root cause',
            cause: hyp.cause || '',
            description: hyp.cause || '',
            explanation: '',
            confidence: Math.round((hyp.confidence ?? apiInc.confidence ?? 0) * 100),
            evidence: [],
            suggestedActions: [],
            isSelected: true,
          },
        ]
      : [],
    actions: actionsTaken.map((a: Record<string, unknown>, idx: number) => ({
      id: `action-${idx}`,
      decision_id: '',
      action_type: (a.action_type as AgentAction['action_type']) || 'notify',
      type: (a.action_type as AgentAction['type']) || 'notify',
      title: String(a.action_type || 'Action').replace(/_/g, ' '),
      description: '',
      reason: '',
      target: '',
      riskLevel: 'medium' as const,
      estimatedImpact: '',
      requiresApproval: false,
      status: a.success ? 'executed' : 'failed',
      created_at: '',
      audit_trail: [],
    })),
    tags: ['migration'],
    affectedSystems: ['Migration Agent'],
    timeToDetection: 0,
  };
}

// Map backend action to frontend AgentAction shape
function mapApiActionToAgentAction(a: ApiAction): AgentAction {
  return {
    id: a.action_id,
    decision_id: a.incident_id ? String(a.incident_id) : '',
    action_type: (a.action_type as AgentAction['action_type']) || 'notify',
    type: (a.action_type as AgentAction['type']) || 'notify',
    title: a.content || a.action_type?.replace(/_/g, ' ') || 'Action',
    description: a.content || a.reasoning || '',
    reason: a.reasoning || a.content || '',
    target: a.target || '',
    riskLevel: (a.risk as AgentAction['riskLevel']) || 'medium',
    estimatedImpact: a.evidence_summary || '',
    requiresApproval: true,
    status: a.status as AgentAction['status'],
    executed_at: a.executed_at,
    approved_by: a.reviewed_by,
    approved_at: a.reviewed_at,
    created_at: a.created_at || '',
    audit_trail: [],
    draft_artifact: a.raw_payload ? {
      type: 'message',
      content: JSON.stringify(a.raw_payload, null, 2),
      target: a.target || '',
    } : undefined,
  };
}

// Map backend pattern to frontend Pattern shape
function mapApiPatternToPattern(p: ApiPattern, idx: number): Pattern {
  return {
    id: `pattern-${idx}`,
    pattern_type: p.pattern_type as Pattern['pattern_type'] || 'cluster',
    pattern_detected: true,
    affected_merchants: p.affected_merchants || 0,
    common_error: p.error_code || p.top_errors?.[0]?.code,
    time_window: p.time_window || 'recent',
    signals: [],
    confidence: 0.8,
    created_at: p.first_seen || new Date().toISOString(),
  };
}

interface ApiContextValue {
  useApi: boolean;
  loading: boolean;
  error: string | null;
  incidents: Incident[];
  pendingActions: AgentAction[];
  actionHistory: AgentAction[];
  agentLoop: AgentLoop;
  systemHealth: SystemHealth;
  patterns: Pattern[];
  events: ApiEvent[];
  healthStatus: ApiHealth | null;
  refresh: () => Promise<void>;
  approveAction: (actionId: string, reviewer?: string) => Promise<void>;
  rejectAction: (actionId: string, reviewer?: string, feedback?: string) => Promise<void>;
  ingestSimulation: () => Promise<void>;
  runAgentLoop: () => Promise<void>;
}

const ApiContext = createContext<ApiContextValue | undefined>(undefined);

export function ApiProvider({ children }: { children: ReactNode }) {
  const [useApi, setUseApi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [actionHistory, setActionHistory] = useState<AgentAction[]>([]);
  const [agentLoop, setAgentLoop] = useState<AgentLoop>({
    currentState: 'idle',
    lastStateChange: new Date().toISOString(),
    observationsCount: 0,
    reasoningCycles: 0,
    decisionsToday: 0,
    actionsToday: 0,
    autoHealRate: 0,
    pendingApprovals: 0,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'degraded',
    apiHealth: 100,
    webhookHealth: 100,
    checkoutFailureRate: 0,
    migrationProgress: 0,
    activeIncidents: 0,
    affectedMerchants: 0,
    currentMigrationPhase: 'mid_migration',
    resolvedToday: 0,
  });
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [healthStatus, setHealthStatus] = useState<ApiHealth | null>(null);

  const refresh = useCallback(async () => {
    if (!useApi) return;
    setLoading(true);
    setError(null);
    try {
      const [incRes, actionsRes, stateRes, patternsRes, eventsRes, healthRes] = await Promise.all([
        api.getIncidents(50),
        api.getPendingActions(),
        api.getAgentState(),
        api.getPatterns().catch(() => ({ patterns: [], summary: '' })),
        api.getEvents(100).catch(() => ({ count: 0, total_pending: 0, signals: [] })),
        api.health().catch(() => null),
      ]);

      // Map incidents
      setIncidents(incRes.incidents.map(mapApiIncidentToIncident));
      
      // Map pending actions
      setPendingActions(actionsRes.actions.map(mapApiActionToAgentAction));
      
      // Map patterns
      if (patternsRes.patterns) {
        setPatterns(patternsRes.patterns.map((p, i) => mapApiPatternToPattern(p as ApiPattern, i)));
      }
      
      // Set events
      setEvents(eventsRes.signals || []);
      
      // Set health
      if (healthRes) {
        setHealthStatus(healthRes);
      }

      // Derive system health from real data
      const activeIncidents = incRes.incidents.filter(i => i.outcome !== 'completed').length;
      const totalAffectedMerchants = patternsRes.patterns?.reduce(
        (sum: number, p: unknown) => sum + ((p as ApiPattern).affected_merchants || 0), 
        0
      ) || 0;
      
      setSystemHealth({
        overall: healthRes?.status === 'healthy' ? 'healthy' : 'degraded',
        apiHealth: healthRes?.checks?.api ? 100 : 100,
        webhookHealth: 100,
        checkoutFailureRate: 0,
        migrationProgress: 0,
        activeIncidents,
        affectedMerchants: totalAffectedMerchants,
        currentMigrationPhase: 'mid_migration',
        resolvedToday: incRes.incidents.filter(i => i.outcome === 'completed').length,
      });

      // Update agent loop state
      setAgentLoop({
        currentState: (stateRes.agent_status as AgentLoop['currentState']) || 'idle',
        lastStateChange: stateRes.last_updated || new Date().toISOString(),
        observationsCount: incRes.count,
        reasoningCycles: incRes.count,
        decisionsToday: actionsRes.count,
        actionsToday: actionsRes.actions.filter(a => a.status === 'executed').length,
        autoHealRate: 0,
        pendingApprovals: actionsRes.count,
      });

      // Fetch action history
      try {
        const historyRes = await api.getActionHistory(50);
        setActionHistory(historyRes.actions.map(mapApiActionToAgentAction));
      } catch {
        // History endpoint might not exist
      }

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [useApi]);

  useEffect(() => {
    isApiAvailable().then((ok) => {
      setUseApi(ok);
      if (ok) refresh();
      else setLoading(false);
    });
  }, [refresh]);

  // Auto-refresh every 30 seconds when API is available
  useEffect(() => {
    if (!useApi) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [useApi, refresh]);

  const approveAction = useCallback(
    async (actionId: string, reviewer = 'dashboard') => {
      if (!useApi) return;
      try {
        await api.approveAction(actionId, { approved: true, reviewer, execute_if_approved: true });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Approve failed');
      }
    },
    [useApi, refresh]
  );

  const rejectAction = useCallback(
    async (actionId: string, reviewer = 'dashboard', feedback?: string) => {
      if (!useApi) return;
      try {
        await api.rejectAction(actionId, { reviewer, feedback });
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Reject failed');
      }
    },
    [useApi, refresh]
  );

  const ingestSimulation = useCallback(async () => {
    if (!useApi) return;
    try {
      await api.ingestSimulation();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ingest failed');
    }
  }, [useApi, refresh]);

  const runAgentLoop = useCallback(async () => {
    if (!useApi) return;
    try {
      await api.runAgentLoop();
      await refresh();
    } catch (e) {
      // Endpoint might not exist yet
      console.warn('Run agent loop failed:', e);
    }
  }, [useApi, refresh]);

  return (
    <ApiContext.Provider
      value={{
        useApi,
        loading,
        error,
        incidents,
        pendingActions,
        actionHistory,
        agentLoop,
        systemHealth,
        patterns,
        events,
        healthStatus,
        refresh,
        approveAction,
        rejectAction,
        ingestSimulation,
        runAgentLoop,
      }}
    >
      {children}
    </ApiContext.Provider>
  );
}

export function useApiContext() {
  const ctx = useContext(ApiContext);
  if (!ctx) throw new Error('useApiContext must be used within ApiProvider');
  return ctx;
}
