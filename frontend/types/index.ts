// ==========================================
// Type Definitions for Data Migration Agent Dashboard
// ==========================================

// Severity levels for incidents
export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

// Status types for incidents
export type IncidentStatus = 'active' | 'investigating' | 'mitigating' | 'resolved' | 'escalated';

// Agent action types
export type ActionType = 'auto-heal' | 'escalate' | 'notify' | 'rollback' | 'retry' | 'investigate' | 'proactive_merchant_message' | 'jira_ticket' | 'doc_update';

// Risk levels for actions
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// Confidence level type (0-100)
export type Confidence = number;

// Signal source types
export type SignalSource = 'api' | 'webhook' | 'ticket' | 'log' | 'metric' | 'alert' | 'checkout';

// Agent states in the observation loop
export type AgentState = 'observe' | 'reason' | 'decide' | 'act' | 'idle';

// Migration stages
export type MigrationStage = 'pre_migration' | 'mid_migration' | 'post_migration';

// Theme types
export type Theme = 'light' | 'dark';

// Merchant with migration info
export interface Merchant {
  id: string;
  name: string;
  migration_stage: MigrationStage;
  enabled_features: string[];
  last_failure?: string;
  failure_count_24h: number;
  checkout_volume_24h: number;
  error_rate: number;
  migrated_at?: string;
  region: string;
}

// Failure event correlated to migration stage
export interface MerchantFailureEvent {
  id: string;
  merchant_id: string;
  timestamp: string;
  error_type: string;
  migration_stage: MigrationStage;
  resolved: boolean;
}

// ==========================================
// Core Data Interfaces
// ==========================================

// Raw signal from backend (OBSERVE layer - ground truth)
export interface Signal {
  id: string;
  event_type: string;
  source: SignalSource;
  timestamp: string;
  title: string;
  description: string;
  severity: Severity;
  merchant_id?: string;
  migration_stage?: MigrationStage;
  raw_text?: string;
  raw_payload?: Record<string, unknown>;
  error_codes?: string[];
  metadata: Record<string, unknown>;
  relatedSignals?: string[];
}

// Pattern detected by observation layer
export interface Pattern {
  id: string;
  pattern_type: 'spike' | 'correlation' | 'anomaly' | 'trend' | 'cluster';
  pattern_detected: boolean;
  affected_merchants: number;
  merchant_ids?: string[];
  common_error?: string;
  time_window: string;
  signals: string[]; // signal IDs
  confidence: number;
  created_at: string;
}

// Hypothesis from reasoning layer
export interface Hypothesis {
  id: string;
  title: string;
  cause: string;
  description: string;
  explanation: string;
  confidence: Confidence;
  evidence: string[];
  pattern_ids?: string[];
  signal_ids?: string[];
  suggestedActions: string[];
  isSelected?: boolean;
}

// Alternative hypothesis
export interface AlternativeHypothesis {
  id: string;
  title: string;
  cause: string;
  explanation: string;
  confidence: number;
  reason_not_selected: string;
  why_less_likely: string;
}

// Reasoning output from LLM
export interface ReasoningOutput {
  id: string;
  incident_id?: string;
  pattern_id: string;
  primary_hypothesis: Hypothesis;
  alternative_hypotheses: AlternativeHypothesis[];
  unknowns: string[];
  assumptions: string[];
  evidence_summary: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

// Decision from decision engine
export interface Decision {
  id: string;
  reasoning_id: string;
  action_type: ActionType;
  title: string;
  description: string;
  risk: RiskLevel;
  confidence: number;
  expected_impact: string;
  impact: string;
  rationale: string;
  requires_human_approval: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  created_at: string;
}

// Agent action (guarded action layer)
export interface AgentAction {
  id: string;
  decision_id: string;
  action_type: ActionType;
  type: ActionType;
  title: string;
  description: string;
  reason: string;
  target: string;
  riskLevel: RiskLevel;
  estimatedImpact: string;
  requiresApproval: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed';
  draft_artifact?: DraftArtifact;
  executed_at?: string;
  executed_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  audit_trail: AuditEntry[];
}

// Draft artifact for review
export interface DraftArtifact {
  type: 'message' | 'jira_ticket' | 'doc_update';
  content: string;
  target: string;
  metadata?: Record<string, unknown>;
}

// Audit entry for action trail
export interface AuditEntry {
  timestamp: string;
  action: string;
  actor: 'agent' | 'human';
  actor_type: 'agent' | 'human';
  actor_name: string;
  details?: string;
}

// Known issue from docs/learnings
export interface KnownIssue {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'resolved' | 'investigating';
  severity: Severity;
  migration_stage: MigrationStage;
  root_cause: string;
  resolution: string;
  affected_merchants: number;
  occurrences: number;
  last_seen: string;
  created_at: string;
  related_signals?: string[];
  tags: string[];
}

// Suggested doc update
export interface SuggestedDocUpdate {
  id: string;
  title: string;
  summary: string;
  current_content?: string;
  suggested_content: string;
  target_doc: string;
  reason: string;
  source_context: string;
  source_incident_id?: string;
  related_action_id?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  migration_stage?: MigrationStage;
  createdAt: string;
  updatedAt: string;
  signals: Signal[];
  patterns?: Pattern[];
  hypotheses: Hypothesis[];
  reasoning?: ReasoningOutput;
  decisions?: Decision[];
  actions: AgentAction[];
  assignee?: string;
  tags: string[];
  affectedSystems: string[];
  affected_merchants?: string[];
  timeToDetection?: number;
  timeToResolution?: number;
}

export interface AgentLoop {
  currentState: AgentState;
  lastStateChange: string;
  observationsCount: number;
  reasoningCycles: number;
  decisionsToday: number;
  actionsToday: number;
  autoHealRate: number;
  pendingApprovals: number;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  apiHealth: number;
  webhookHealth: number;
  checkoutFailureRate: number;
  migrationProgress: number;
  activeIncidents: number;
  affectedMerchants: number;
  currentMigrationPhase: MigrationStage;
  resolvedToday: number;
}

export interface MigrationMetrics {
  totalEndpoints: number;
  migratedEndpoints: number;
  inProgressEndpoints: number;
  failedEndpoints: number;
  estimatedCompletion: string;
  riskScore: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string;
  actor: 'agent' | 'human';
  actorName: string;
  description: string;
  incidentId?: string;
  metadata?: Record<string, unknown>;
}

export interface SupportResponse {
  id: string;
  suggestedResponse: string;
  confidence: Confidence;
  sources: string[];
  explanation: string;
  alternativeResponses?: string[];
}

// ==========================================
// Chart Data Types
// ==========================================

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface CategoryDataPoint {
  category: string;
  value: number;
  color?: string;
}

export interface HealthTrendData {
  date: string;
  apiHealth: number;
  webhookHealth: number;
  incidentCount: number;
}

// ==========================================
// Component Props Types
// ==========================================

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface MotionComponentProps extends BaseComponentProps {
  delay?: number;
  duration?: number;
  disabled?: boolean;
}

export interface ChartProps {
  data: unknown[];
  height?: number;
  showLegend?: boolean;
  animate?: boolean;
}
