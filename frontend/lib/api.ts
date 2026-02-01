/**
 * API client for Migration Incident Intelligence Backend
 * Fetches from backend when NEXT_PUBLIC_API_URL is set
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ==========================================
// API Types (backend response shapes)
// ==========================================

export interface ApiIncident {
  id: number;
  signal_cluster: string;
  root_cause: string;
  confidence: number;
  action_taken: unknown;
  outcome?: string;
  created_at: string;
  observation?: { patterns?: unknown[]; summary?: string };
  reasoning?: { primary_hypothesis?: { cause?: string; confidence?: number }; confidence?: number };
  pattern_summary?: string;
  feedback?: { feedback_type: string; corrected_cause?: string }[];
}

export interface ApiAction {
  id?: number;
  action_id: string;
  incident_id?: number;
  action_type: string;
  target: string;
  content?: string;
  status: string;
  confidence?: number;
  reasoning?: string;
  risk?: string;
  severity?: string;
  evidence_summary?: string;
  raw_payload?: Record<string, unknown>;
  created_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  feedback?: string;
  executed_at?: string;
}

export interface ApiAgentState {
  detected_issues: { issue_id: string; description: string; confidence: number; severity?: string }[];
  proposed_actions: ApiAction[];
  overall_confidence: number;
  agent_status: string;
  last_updated?: string;
  assumptions?: string[];
}

export interface ApiHealth {
  status: string;
  version: string;
  timestamp?: string;
  checks: { database?: string; events_pending?: number; api?: string; scheduler_enabled?: boolean };
}

export interface ApiPattern {
  pattern_type: string;
  error_code?: string;
  affected_merchants: number;
  total_occurrences?: number;
  affected_endpoints?: string[];
  affected_sources?: string[];
  first_seen?: string;
  severity?: string;
  time_window?: string;
  top_errors?: { code: string; count: number }[];
}

export interface ApiPatternsResponse {
  patterns: ApiPattern[];
  summary: string;
  incident_id?: number;
  root_cause?: string;
  confidence?: number;
}

export interface ApiEvent {
  id: number;
  signal_id?: string;
  event_type: string;
  merchant_id?: string;
  migration_stage?: string;
  error_code?: string;
  timestamp: string;
  raw_payload?: Record<string, unknown>;
  source?: string;
  processed?: boolean;
  created_at?: string;
}

export interface ApiConfidenceHistory {
  id: number;
  signal_cluster: string;
  confidence: number;
  recorded_at: string;
}

export interface ApiOverview {
  active_incidents: number;
  pending_actions: number;
  events_today: number;
  affected_merchants: number;
  checkout_failure_rate: number;
  avg_confidence: number;
  recent_patterns: ApiPattern[];
  recent_actions: ApiAction[];
}

// ==========================================
// API Client
// ==========================================

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error((err as { detail?: string }).detail || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => fetchApi<ApiHealth>('/api/health'),

  // ==================== Incidents ====================
  getIncidents: (limit = 20) =>
    fetchApi<{ count: number; incidents: ApiIncident[] }>(`/api/incidents?limit=${limit}`),

  getIncident: (id: number) => fetchApi<ApiIncident>(`/api/incidents/${id}`),

  getPatterns: () =>
    fetchApi<ApiPatternsResponse>('/api/incidents/patterns'),

  submitFeedback: (incidentId: number, data: { feedback_type: string; corrected_cause?: string; reviewer?: string }) =>
    fetchApi<{ success: boolean }>(`/api/incidents/${incidentId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ==================== Agent State ====================
  getAgentState: () => fetchApi<ApiAgentState>('/api/agent/state'),

  getDetectedIssues: (minConfidence = 0) =>
    fetchApi<{ count: number; issues: ApiAgentState['detected_issues'] }>(
      `/api/agent/issues?min_confidence=${minConfidence}`
    ),

  // ==================== Actions ====================
  getPendingActions: () =>
    fetchApi<{ count: number; actions: ApiAction[] }>('/api/actions/pending'),

  getActionHistory: (limit = 50) =>
    fetchApi<{ count: number; actions: ApiAction[] }>(`/api/actions/history?limit=${limit}`),

  approveAction: (actionId: string, body: { approved: boolean; reviewer?: string; execute_if_approved?: boolean }) =>
    fetchApi<{ action_id: string; status: string; execution?: unknown }>(
      `/api/actions/${actionId}/approve`,
      { method: 'POST', body: JSON.stringify({ ...body, approved: true }) }
    ),

  rejectAction: (actionId: string, body?: { reviewer?: string; feedback?: string }) =>
    fetchApi<{ action_id: string; status: string }>(`/api/actions/${actionId}/reject`, {
      method: 'POST',
      body: JSON.stringify(body || { approved: false }),
    }),

  // ==================== Events/Signals ====================
  getEvents: (limit = 100) =>
    fetchApi<{ count: number; total_pending: number; signals: ApiEvent[] }>(`/api/signals/all?limit=${limit}`),
  
  getPendingEvents: (limit = 100) =>
    fetchApi<{ count: number; total_pending: number; signals: ApiEvent[] }>(`/api/signals/pending?limit=${limit}`),

  ingestEvents: (events: Record<string, unknown>[]) =>
    fetchApi<{ accepted: number; event_ids: number[] }>('/api/events', {
      method: 'POST',
      body: JSON.stringify(events),
    }),

  // ==================== Simulations ====================
  ingestSimulation: () =>
    fetchApi<{ ingested: number }>('/simulations/ingest?data_type=all', { method: 'POST' }),

  loadSimulationData: (dataType: 'tickets' | 'api_errors' | 'webhook_failures' | 'migration_states' | 'all' = 'all') =>
    fetchApi<{ data_type: string; record_count: number; data: unknown[] }>(
      `/simulations/load?data_type=${dataType}`
    ),

  // ==================== Run Agent ====================
  runAgentLoop: () =>
    fetchApi<{ success: boolean; incident_id?: number; result?: unknown }>('/api/agent/run', {
      method: 'POST',
    }),
};

// ==========================================
// Check if API is available
// ==========================================

export async function isApiAvailable(): Promise<boolean> {
  try {
    const health = await api.health();
    return health?.status === 'healthy';
  } catch {
    return false;
  }
}
