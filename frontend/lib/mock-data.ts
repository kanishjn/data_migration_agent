import type { 
  Incident, 
  Signal, 
  AgentLoop, 
  SystemHealth, 
  AuditLogEntry, 
  MigrationMetrics, 
  HealthTrendData,
  Pattern,
  ReasoningOutput,
  Decision,
  AgentAction,
  KnownIssue,
  SuggestedDocUpdate,
  Merchant,
  MerchantFailureEvent,
  MigrationStage,
} from '@/types';

// ==========================================
// Mock Signals
// ==========================================

const mockSignals: Signal[] = [
  {
    id: 'sig-001',
    event_type: 'api_error',
    source: 'api',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    title: 'Elevated 5xx Error Rate',
    description: 'API error rate increased to 4.7% on /api/v2/products endpoint. Normal baseline is 0.1%.',
    severity: 'high',
    metadata: {
      endpoint: '/api/v2/products',
      errorRate: 4.7,
      requestCount: 12500,
      affectedRegion: 'us-east-1',
    },
    relatedSignals: ['sig-002'],
  },
  {
    id: 'sig-002',
    event_type: 'webhook_failure',
    source: 'webhook',
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    title: 'Webhook Delivery Failures',
    description: 'Product sync webhooks failing to deliver to 3 merchant endpoints.',
    severity: 'medium',
    metadata: {
      failedDeliveries: 47,
      affectedMerchants: ['merchant-123', 'merchant-456', 'merchant-789'],
      lastSuccessfulDelivery: new Date(Date.now() - 3600000).toISOString(),
    },
    relatedSignals: ['sig-001'],
  },
  {
    id: 'sig-003',
    event_type: 'support_ticket',
    source: 'ticket',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    title: 'Customer Reports: Product Data Missing',
    description: 'Multiple support tickets reporting missing product information on storefronts.',
    severity: 'high',
    metadata: {
      ticketCount: 8,
      averageWaitTime: '15m',
      commonKeywords: ['products', 'missing', 'inventory', 'sync'],
    },
  },
  {
    id: 'sig-004',
    event_type: 'metric_alert',
    source: 'metric',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    title: 'Database Connection Pool Saturation',
    description: 'Connection pool utilization at 94%. Queries are beginning to queue.',
    severity: 'medium',
    metadata: {
      poolSize: 100,
      activeConnections: 94,
      queuedQueries: 23,
    },
  },
];

// ==========================================
// Mock Incidents
// ==========================================

export const mockIncidents: Incident[] = [
  {
    id: 'inc-001',
    title: 'Product Catalog Sync Failure - Multiple Merchants Affected',
    description: 'Product data synchronization is failing for merchants migrated to headless architecture. API errors and webhook failures detected.',
    severity: 'critical',
    status: 'investigating',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    updatedAt: new Date(Date.now() - 300000).toISOString(),
    signals: mockSignals,
    hypotheses: [
      {
        id: 'hyp-001',
        title: 'Database Connection Pool Exhaustion',
        cause: 'Connection pool saturation',
        description: 'High query volume from new headless API is exhausting the connection pool, causing cascading failures.',
        explanation: 'The new headless API generates significantly more database queries per request than the legacy system. This increased load is saturating the connection pool.',
        confidence: 78,
        evidence: [
          'Connection pool at 94% utilization',
          'Query queue growing',
          'Errors correlate with pool saturation',
        ],
        suggestedActions: ['Increase pool size', 'Enable connection pooling', 'Add read replicas'],
        isSelected: true,
      },
      {
        id: 'hyp-002',
        title: 'Headless API Rate Limit Exceeded',
        cause: 'Rate limit exceeded',
        description: 'New API version has stricter rate limits that legacy sync jobs are exceeding.',
        explanation: 'Legacy sync jobs were designed for higher rate limits. The new API has stricter limits that are being exceeded.',
        confidence: 45,
        evidence: [
          'Rate limit headers present in responses',
          'Sync job frequency unchanged from legacy',
        ],
        suggestedActions: ['Implement backoff', 'Batch requests', 'Increase rate limits'],
      },
      {
        id: 'hyp-003',
        title: 'Schema Mismatch Post-Migration',
        cause: 'Schema incompatibility',
        description: 'Data transformation layer has incompatible field mappings.',
        explanation: 'Field mappings between legacy and new schemas may have discrepancies causing validation failures.',
        confidence: 23,
        evidence: [
          'Some 400 errors in logs',
          'Field validation failures',
        ],
        suggestedActions: ['Audit schema mappings', 'Add field transformers'],
      },
    ],
    actions: [
      {
        id: 'act-001',
        decision_id: 'dec-auto-001',
        action_type: 'auto-heal',
        type: 'auto-heal',
        title: 'Scale Connection Pool to 150',
        description: 'Automatically increase database connection pool size from 100 to 150.',
        reason: 'Connection pool saturation detected. Scaling to 150 connections to handle increased load.',
        target: 'database/connection-pool',
        riskLevel: 'low',
        estimatedImpact: 'Should resolve 50% of queued queries immediately',
        requiresApproval: false,
        status: 'executed',
        created_at: new Date(Date.now() - 650000).toISOString(),
        executed_at: new Date(Date.now() - 600000).toISOString(),
        executed_by: 'Agent',
        audit_trail: [],
      },
      {
        id: 'act-002',
        decision_id: 'dec-auto-002',
        action_type: 'notify',
        type: 'notify',
        title: 'Alert On-Call Engineer',
        description: 'Send PagerDuty alert to on-call platform engineer.',
        reason: 'Critical incident requires human oversight.',
        target: 'pagerduty/on-call',
        riskLevel: 'low',
        estimatedImpact: 'Human awareness within 5 minutes',
        requiresApproval: false,
        status: 'executed',
        created_at: new Date(Date.now() - 600000).toISOString(),
        executed_at: new Date(Date.now() - 550000).toISOString(),
        executed_by: 'Agent',
        audit_trail: [],
      },
      {
        id: 'act-003',
        decision_id: 'dec-auto-003',
        action_type: 'rollback',
        type: 'rollback',
        title: 'Revert to Legacy Sync Endpoint',
        description: 'Temporarily route traffic back to legacy v1 API for affected merchants.',
        reason: 'High-risk rollback may be necessary if other mitigations fail.',
        target: 'api/sync-endpoint',
        riskLevel: 'high',
        estimatedImpact: 'Full resolution but delays migration timeline',
        requiresApproval: true,
        status: 'pending',
        created_at: new Date(Date.now() - 500000).toISOString(),
        audit_trail: [],
      },
    ],
    tags: ['migration', 'database', 'api', 'critical'],
    affectedSystems: ['Product Catalog API', 'Webhook Service', 'Merchant Sync'],
    timeToDetection: 120,
  },
  {
    id: 'inc-002',
    title: 'Checkout Flow Latency Spike',
    description: 'Checkout API response times increased 3x in the last hour. No errors but degraded UX.',
    severity: 'high',
    status: 'mitigating',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date(Date.now() - 1800000).toISOString(),
    signals: [
      {
        id: 'sig-010',
        event_type: 'metric_alert',
        source: 'metric',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        title: 'P95 Latency Exceeded SLO',
        description: 'Checkout endpoint P95 latency at 2.4s (SLO: 800ms)',
        severity: 'high',
        metadata: { p95: 2400, slo: 800 },
      },
    ],
    hypotheses: [
      {
        id: 'hyp-010',
        title: 'Payment Provider Degradation',
        cause: 'Third-party service degradation',
        description: 'Third-party payment processor experiencing slowdown.',
        explanation: 'External payment gateway is experiencing higher than normal latency, affecting all checkout requests that route through this provider.',
        confidence: 85,
        evidence: ['External status page shows degraded performance'],
        suggestedActions: ['Enable payment failover', 'Cache payment tokens'],
        isSelected: true,
      },
    ],
    actions: [
      {
        id: 'act-010',
        decision_id: 'dec-010',
        action_type: 'auto-heal',
        type: 'auto-heal',
        title: 'Enable Payment Failover',
        description: 'Route 30% of traffic to backup payment processor.',
        reason: 'Primary payment processor degraded. Failover will reduce impact.',
        target: 'payment-gateway/routing',
        riskLevel: 'medium',
        estimatedImpact: 'Reduce average latency by ~40%',
        requiresApproval: false,
        status: 'executed',
        created_at: new Date(Date.now() - 1900000).toISOString(),
        executed_at: new Date(Date.now() - 1800000).toISOString(),
        executed_by: 'Agent',
        audit_trail: [],
      },
    ],
    tags: ['checkout', 'latency', 'payment'],
    affectedSystems: ['Checkout API', 'Payment Gateway'],
    timeToDetection: 180,
    timeToResolution: 5400,
  },
  {
    id: 'inc-003',
    title: 'Inventory Sync Delay - EU Region',
    description: 'Inventory updates for EU merchants delayed by 15+ minutes.',
    severity: 'medium',
    status: 'resolved',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 82800000).toISOString(),
    signals: [
      {
        id: 'sig-020',
        event_type: 'queue_alert',
        source: 'alert',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        title: 'Queue Backlog Alert',
        description: 'EU inventory queue has 50k+ pending messages.',
        severity: 'medium',
        metadata: { queueDepth: 52000, region: 'eu-west-1' },
      },
    ],
    hypotheses: [
      {
        id: 'hyp-020',
        title: 'Consumer Scaling Issue',
        cause: 'Auto-scaling misconfiguration',
        description: 'Auto-scaling not triggering for EU consumers.',
        explanation: 'The auto-scaling policy for EU consumers has incorrect thresholds, preventing scale-up during high load.',
        confidence: 92,
        evidence: ['Consumer count stable despite queue growth'],
        suggestedActions: ['Manual scale-up', 'Fix scaling policy'],
        isSelected: true,
      },
    ],
    actions: [
      {
        id: 'act-020',
        decision_id: 'dec-020',
        action_type: 'auto-heal',
        type: 'auto-heal',
        title: 'Scale EU Consumers to 20',
        description: 'Increase consumer pod count from 5 to 20.',
        reason: 'Queue backlog growing. Manual scale-up needed.',
        target: 'k8s/eu-consumers',
        riskLevel: 'low',
        estimatedImpact: 'Clear backlog in ~10 minutes',
        requiresApproval: false,
        status: 'executed',
        created_at: new Date(Date.now() - 85500000).toISOString(),
        executed_at: new Date(Date.now() - 85000000).toISOString(),
        executed_by: 'Agent',
        audit_trail: [],
      },
    ],
    tags: ['inventory', 'queue', 'eu-region'],
    affectedSystems: ['Inventory Service', 'Message Queue'],
    timeToDetection: 300,
    timeToResolution: 1800,
  },
];

// ==========================================
// Mock Agent Loop State
// ==========================================

export const mockAgentLoop: AgentLoop = {
  currentState: 'reason',
  lastStateChange: new Date(Date.now() - 30000).toISOString(),
  observationsCount: 147,
  reasoningCycles: 23,
  decisionsToday: 8,
  actionsToday: 12,
  autoHealRate: 73,
  pendingApprovals: 2,
};

// ==========================================
// Mock System Health
// ==========================================

export const mockSystemHealth: SystemHealth = {
  overall: 'degraded',
  apiHealth: 96.2,
  webhookHealth: 87.5,
  checkoutFailureRate: 2.3,
  migrationProgress: 67,
  activeIncidents: 2,
  affectedMerchants: 27,
  currentMigrationPhase: 'mid_migration',
  resolvedToday: 5,
};

// ==========================================
// Mock Migration Metrics
// ==========================================

export const mockMigrationMetrics: MigrationMetrics = {
  totalEndpoints: 245,
  migratedEndpoints: 164,
  inProgressEndpoints: 23,
  failedEndpoints: 3,
  estimatedCompletion: '2026-02-15',
  riskScore: 34,
};

// ==========================================
// Mock Audit Log
// ==========================================

export const mockAuditLog: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    action: 'Scaled connection pool',
    actor: 'agent',
    actorName: 'Decision Agent',
    description: 'Automatically increased database connection pool from 100 to 150 connections.',
    incidentId: 'inc-001',
    metadata: { previousValue: 100, newValue: 150 },
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    action: 'Created incident',
    actor: 'agent',
    actorName: 'Observer Agent',
    description: 'Correlated 4 signals into new incident: Product Catalog Sync Failure.',
    incidentId: 'inc-001',
  },
  {
    id: 'audit-003',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    action: 'Approved rollback',
    actor: 'human',
    actorName: 'Sarah Chen',
    description: 'Approved temporary rollback to legacy checkout flow.',
    incidentId: 'inc-002',
  },
  {
    id: 'audit-004',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    action: 'Resolved incident',
    actor: 'agent',
    actorName: 'Action Agent',
    description: 'Marked incident as resolved after all metrics returned to normal.',
    incidentId: 'inc-003',
  },
  {
    id: 'audit-005',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    action: 'Escalated to human',
    actor: 'agent',
    actorName: 'Decision Agent',
    description: 'High-risk action requires human approval: Production database migration.',
  },
];

// ==========================================
// Mock Health Trend Data
// ==========================================

export const mockHealthTrendData: HealthTrendData[] = Array.from({ length: 24 }, (_, i) => ({
  date: new Date(Date.now() - (23 - i) * 3600000).toISOString(),
  apiHealth: 95 + Math.random() * 5,
  webhookHealth: 85 + Math.random() * 10,
  incidentCount: Math.floor(Math.random() * 3),
}));

// ==========================================
// Mock Support Responses
// ==========================================

export const mockSupportResponse = {
  id: 'resp-001',
  suggestedResponse: `Hi [Customer Name],

Thank you for reaching out about the product sync issues you're experiencing.

We've identified an issue affecting product catalog synchronization for merchants on our new headless architecture. Our engineering team is actively working on this and has already implemented initial mitigations that should improve the situation.

**Current Status:** We've scaled our database infrastructure and are seeing improvements in sync reliability.

**Expected Resolution:** Full resolution expected within the next 2 hours.

**Workaround:** If you need immediate access to your product data, you can use the legacy API endpoint temporarily: \`/api/v1/products\`

I'll follow up with you once this is fully resolved. Please let me know if you have any questions.

Best regards,
[Agent Name]`,
  confidence: 87,
  sources: [
    'Incident INC-001: Product Catalog Sync Failure',
    'KB Article: Headless Migration FAQ',
    'Similar ticket: TKT-4523 (resolved)',
  ],
  explanation: 'This response was generated based on the active incident affecting product sync, combined with our standard communication templates for service degradation. The workaround suggestion comes from our migration documentation.',
};

// ==========================================
// Mock Raw Signals (OBSERVE layer - ground truth)
// ==========================================

export const mockRawSignals: Signal[] = [
  {
    id: 'sig-raw-001',
    event_type: 'checkout_failure',
    source: 'checkout',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    title: 'Checkout Failure - Merchant m_123',
    description: 'Checkout used to work, now it fails with 500 error',
    severity: 'high',
    merchant_id: 'm_123',
    migration_stage: 'post_migration',
    raw_text: 'Error: Unable to process checkout. Payment gateway timeout after 30s.',
    error_codes: ['GATEWAY_TIMEOUT', 'CHECKOUT_500'],
    metadata: {
      checkout_id: 'chk_abc123',
      cart_value: 149.99,
      payment_method: 'credit_card',
    },
  },
  {
    id: 'sig-raw-002',
    event_type: 'webhook_failure',
    source: 'webhook',
    timestamp: new Date(Date.now() - 1500000).toISOString(),
    title: 'Webhook Delivery Failed - Order Sync',
    description: 'Order sync webhook failed to deliver to merchant endpoint',
    severity: 'medium',
    merchant_id: 'm_456',
    migration_stage: 'mid_migration',
    raw_text: 'HTTP 502 Bad Gateway when posting to merchant webhook endpoint',
    error_codes: ['WEBHOOK_502', 'DELIVERY_FAILED'],
    metadata: {
      webhook_id: 'whk_xyz789',
      endpoint: 'https://merchant-456.com/webhooks/orders',
      retry_count: 3,
    },
  },
  {
    id: 'sig-raw-003',
    event_type: 'checkout_failure',
    source: 'checkout',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    title: 'Checkout Failure - Merchant m_789',
    description: 'Missing checkout webhook configuration',
    severity: 'high',
    merchant_id: 'm_789',
    migration_stage: 'post_migration',
    raw_text: 'Webhook endpoint not configured for checkout events',
    error_codes: ['WEBHOOK_NOT_CONFIGURED'],
    metadata: {
      merchant_tier: 'enterprise',
    },
  },
  {
    id: 'sig-raw-004',
    event_type: 'api_error',
    source: 'api',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    title: 'API Rate Limit Exceeded',
    description: 'Product sync API hitting rate limits',
    severity: 'medium',
    merchant_id: 'm_234',
    migration_stage: 'mid_migration',
    error_codes: ['RATE_LIMIT_429'],
    metadata: {
      endpoint: '/api/v2/products/sync',
      requests_per_minute: 150,
      limit: 100,
    },
  },
  {
    id: 'sig-raw-005',
    event_type: 'support_ticket',
    source: 'ticket',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    title: 'Customer Complaint - Orders Not Syncing',
    description: 'Merchant reports orders not appearing in their system',
    severity: 'high',
    merchant_id: 'm_567',
    migration_stage: 'post_migration',
    raw_text: 'Our orders stopped syncing 2 hours ago. We are losing sales visibility.',
    metadata: {
      ticket_id: 'TKT-8234',
      priority: 'urgent',
      merchant_tier: 'enterprise',
    },
  },
];

// ==========================================
// Mock Patterns (Observation Layer)
// ==========================================

export const mockPatterns: Pattern[] = [
  {
    id: 'pat-001',
    pattern_type: 'spike',
    pattern_detected: true,
    affected_merchants: 27,
    merchant_ids: ['m_123', 'm_789', 'm_567'],
    common_error: 'Missing checkout webhook',
    time_window: 'last 2 hours',
    signals: ['sig-raw-001', 'sig-raw-003', 'sig-raw-005'],
    confidence: 89,
    created_at: new Date(Date.now() - 1000000).toISOString(),
  },
  {
    id: 'pat-002',
    pattern_type: 'correlation',
    pattern_detected: true,
    affected_merchants: 12,
    common_error: 'Webhook delivery failures correlated with migration stage',
    time_window: 'last 4 hours',
    signals: ['sig-raw-002', 'sig-raw-004'],
    confidence: 76,
    created_at: new Date(Date.now() - 800000).toISOString(),
  },
  {
    id: 'pat-003',
    pattern_type: 'trend',
    pattern_detected: true,
    affected_merchants: 45,
    common_error: 'Increasing checkout failures in post-migration merchants',
    time_window: 'last 24 hours',
    signals: ['sig-raw-001', 'sig-raw-003'],
    confidence: 92,
    created_at: new Date(Date.now() - 500000).toISOString(),
  },
];

// ==========================================
// Mock Reasoning Outputs
// ==========================================

export const mockReasoningOutputs: ReasoningOutput[] = [
  {
    id: 'reason-001',
    incident_id: 'inc-001',
    pattern_id: 'pat-001',
    primary_hypothesis: {
      id: 'hyp-primary-001',
      title: 'Migration Webhook Misconfiguration',
      cause: 'Migration misconfiguration',
      description: 'Post-migration merchants are missing critical webhook configurations that were not properly transferred from legacy system.',
      explanation: 'Post-migration merchants are missing critical webhook configurations that were not properly transferred from legacy system. The migration scripts did not include webhook endpoint transfer logic.',
      confidence: 72,
      evidence: [
        'Pattern detected: 27 merchants affected with same error type',
        'All affected merchants are post-migration',
        'Webhook configuration audit shows missing endpoints',
      ],
      pattern_ids: ['pat-001', 'pat-003'],
      signal_ids: ['sig-raw-001', 'sig-raw-003', 'sig-raw-005'],
      suggestedActions: [
        'Run webhook configuration repair script',
        'Notify affected merchants',
        'Add pre-migration validation check',
      ],
    },
    alternative_hypotheses: [
      {
        id: 'alt-001',
        title: 'Infrastructure Scaling Issue',
        cause: 'Infrastructure scaling issue',
        explanation: 'The checkout service may be experiencing capacity issues due to increased load from migrated merchants.',
        confidence: 45,
        reason_not_selected: 'No correlation with infrastructure metrics',
        why_less_likely: 'Infrastructure metrics show normal load and no scaling events during the incident timeframe.',
      },
      {
        id: 'alt-002',
        title: 'Third-party Gateway Degradation',
        cause: 'Third-party gateway degradation',
        explanation: 'Payment gateway service may be experiencing issues affecting checkout completion.',
        confidence: 23,
        reason_not_selected: 'Gateway status page shows healthy',
        why_less_likely: 'External gateway status page shows 100% uptime and no reported incidents.',
      },
    ],
    unknowns: [
      'Exact scope of affected merchants not fully determined',
      'Whether issue affects all checkout types or specific flows',
    ],
    assumptions: [
      'Migration scripts ran successfully on infrastructure side',
      'Webhook endpoint URLs were valid pre-migration',
    ],
    evidence_summary: '27 merchants affected in last 2 hours. Pattern shows correlation with post-migration status. 89% confidence in pattern detection.',
    confidence: 72,
    created_at: new Date(Date.now() - 900000).toISOString(),
    updated_at: new Date(Date.now() - 300000).toISOString(),
  },
];

// ==========================================
// Mock Decisions
// ==========================================

export const mockDecisions: Decision[] = [
  {
    id: 'dec-001',
    reasoning_id: 'reason-001',
    action_type: 'proactive_merchant_message',
    title: 'Send Proactive Message to Affected Merchants',
    description: 'Notify 27 affected merchants about the checkout issue and expected resolution time.',
    risk: 'low',
    confidence: 78,
    expected_impact: 'Reduce support ticket volume by ~60%',
    impact: 'Reduce support ticket volume by ~60% and improve merchant satisfaction',
    rationale: 'Proactive communication reduces merchant anxiety and support load. Low risk action that can be executed immediately.',
    requires_human_approval: false,
    status: 'executed',
    created_at: new Date(Date.now() - 800000).toISOString(),
  },
  {
    id: 'dec-002',
    reasoning_id: 'reason-001',
    action_type: 'auto-heal',
    title: 'Run Webhook Configuration Repair',
    description: 'Execute automated script to restore missing webhook configurations for affected merchants.',
    risk: 'medium',
    confidence: 72,
    expected_impact: 'Restore checkout functionality for 27 merchants',
    impact: 'Restore checkout functionality for 27 merchants within 5 minutes',
    rationale: 'Automated repair script has been validated in staging. Medium risk due to potential for partial failures.',
    requires_human_approval: true,
    status: 'pending',
    created_at: new Date(Date.now() - 700000).toISOString(),
  },
  {
    id: 'dec-003',
    reasoning_id: 'reason-001',
    action_type: 'jira_ticket',
    title: 'Create Engineering Ticket for Root Cause',
    description: 'Create JIRA ticket to investigate why migration scripts did not transfer webhook configurations.',
    risk: 'low',
    confidence: 85,
    expected_impact: 'Prevent recurrence in future migrations',
    impact: 'Prevent recurrence in future migrations and improve migration process',
    rationale: 'Root cause investigation needed to prevent this issue from affecting future merchant migrations.',
    requires_human_approval: false,
    status: 'executed',
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
];

// ==========================================
// Mock Pending Actions (Guarded Action Layer)
// ==========================================

export const mockPendingActions: AgentAction[] = [
  {
    id: 'action-001',
    decision_id: 'dec-002',
    action_type: 'auto-heal',
    type: 'auto-heal',
    title: 'Run Webhook Configuration Repair Script',
    description: 'Execute repair_webhook_config.py to restore missing configurations for 27 merchants.',
    reason: 'Pattern analysis shows webhook misconfiguration as root cause with 72% confidence.',
    target: 'merchants: m_123, m_789, m_567 (+24 more)',
    riskLevel: 'medium',
    estimatedImpact: 'Restore checkout functionality for 27 merchants within 5 minutes',
    requiresApproval: true,
    status: 'pending',
    created_at: new Date(Date.now() - 700000).toISOString(),
    draft_artifact: {
      type: 'message',
      target: 'repair_webhook_config.py',
      content: `# Webhook Configuration Repair

## Affected Merchants: 27
## Migration Stage: post_migration

### Script to Execute:
\`\`\`bash
python repair_webhook_config.py --merchants m_123,m_789,m_567 --dry-run=false
\`\`\`

### Expected Changes:
- Restore checkout webhook endpoints
- Re-register event subscriptions
- Validate configuration post-repair`,
      metadata: {
        script_path: '/scripts/repair_webhook_config.py',
        affected_count: 27,
      },
    },
    audit_trail: [
      {
        timestamp: new Date(Date.now() - 700000).toISOString(),
        action: 'Decision created',
        actor: 'agent',
        actor_type: 'agent',
        actor_name: 'Decision Agent',
        details: 'Created based on reasoning output reason-001',
      },
      {
        timestamp: new Date(Date.now() - 650000).toISOString(),
        action: 'Pending approval',
        actor: 'agent',
        actor_type: 'agent',
        actor_name: 'Action Agent',
        details: 'Medium risk action requires human approval',
      },
    ],
  },
  {
    id: 'action-002',
    decision_id: 'dec-004',
    action_type: 'rollback',
    type: 'rollback',
    title: 'Rollback Checkout API to v1.2',
    description: 'Revert checkout API to previous stable version due to error spike.',
    reason: 'New checkout flow showing 3x error rate compared to baseline.',
    target: 'deployment/checkout-api',
    riskLevel: 'high',
    estimatedImpact: 'Immediately resolve checkout errors but lose new features',
    requiresApproval: true,
    status: 'pending',
    created_at: new Date(Date.now() - 400000).toISOString(),
    draft_artifact: {
      type: 'message',
      target: 'checkout-api deployment',
      content: `# Checkout API Rollback

## Current Version: v1.3.2
## Rollback Target: v1.2.8

### Rollback Command:
\`\`\`bash
kubectl rollout undo deployment/checkout-api --to-revision=42
\`\`\`

### Impact:
- New payment methods will be temporarily unavailable
- Analytics tracking will revert to legacy format`,
    },
    audit_trail: [
      {
        timestamp: new Date(Date.now() - 400000).toISOString(),
        action: 'Decision created',
        actor: 'agent',
        actor_type: 'agent',
        actor_name: 'Decision Agent',
        details: 'Created based on error rate spike detection',
      },
    ],
  },
];

// ==========================================
// Mock Known Issues
// ==========================================

export const mockKnownIssues: KnownIssue[] = [
  {
    id: 'ki-001',
    title: 'Webhook Configuration Lost During Migration',
    description: 'Some webhook configurations are not properly transferred during merchant migration to the new platform.',
    status: 'active',
    severity: 'high',
    migration_stage: 'post_migration',
    root_cause: 'Migration scripts do not include webhook endpoint transfer logic. The legacy webhook registry is not queried during migration.',
    resolution: 'Run repair_webhook_config.py script to restore configurations. Add pre-migration validation step.',
    affected_merchants: 27,
    occurrences: 3,
    last_seen: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 604800000).toISOString(),
    related_signals: ['sig-raw-001', 'sig-raw-003', 'sig-raw-005'],
    tags: ['webhook', 'migration', 'configuration'],
  },
  {
    id: 'ki-002',
    title: 'Rate Limiting During Bulk Product Sync',
    description: 'Merchants with large catalogs hit rate limits during initial product sync after migration.',
    status: 'investigating',
    severity: 'medium',
    migration_stage: 'mid_migration',
    root_cause: 'Default rate limits are too restrictive for initial bulk sync. Migration does not request temporary limit increase.',
    resolution: 'Use batch sync endpoint with exponential backoff. Consider temporary rate limit increase.',
    affected_merchants: 12,
    occurrences: 7,
    last_seen: new Date(Date.now() - 172800000).toISOString(),
    created_at: new Date(Date.now() - 1209600000).toISOString(),
    related_signals: ['sig-raw-004'],
    tags: ['rate-limit', 'sync', 'products'],
  },
  {
    id: 'ki-003',
    title: 'Legacy API Token Invalidation',
    description: 'Legacy API tokens not automatically invalidated post-migration causing confusion.',
    status: 'resolved',
    severity: 'low',
    migration_stage: 'post_migration',
    root_cause: 'Token cleanup is not part of migration checklist. Merchants continue using old tokens which fail silently.',
    resolution: 'Add token cleanup step to migration checklist. Notify merchants about token rotation.',
    affected_merchants: 45,
    occurrences: 12,
    last_seen: new Date(Date.now() - 43200000).toISOString(),
    created_at: new Date(Date.now() - 2592000000).toISOString(),
    tags: ['authentication', 'tokens', 'cleanup'],
  },
];

// ==========================================
// Mock Suggested Doc Updates
// ==========================================

export const mockSuggestedDocUpdates: SuggestedDocUpdate[] = [
  {
    id: 'doc-001',
    title: 'Add Webhook Validation to Migration Checklist',
    summary: 'Add webhook configuration validation step to prevent post-migration checkout failures.',
    current_content: 'Migration checklist does not include webhook configuration validation.',
    target_doc: 'docs/migration/checklist.md',
    suggested_content: `## Pre-Migration Checklist
...existing items...

### Webhook Configuration Validation (NEW)
- [ ] Export current webhook configurations
- [ ] Validate all endpoint URLs are accessible
- [ ] Document custom headers and authentication
- [ ] Create backup of webhook event subscriptions`,
    reason: 'Pattern pat-001 detected webhook misconfiguration affecting 27 merchants. Adding validation step prevents recurrence.',
    source_context: 'Incident INC-001 revealed that webhook configurations are not transferred during migration. This affected 27 merchants.',
    source_incident_id: 'inc-001',
    related_action_id: 'action-001',
    status: 'pending',
    created_at: new Date(Date.now() - 500000).toISOString(),
  },
  {
    id: 'doc-002',
    title: 'Document Rate Limit Handling for Bulk Sync',
    summary: 'Add best practices for handling rate limits during bulk product synchronization.',
    target_doc: 'docs/api/rate-limits.md',
    suggested_content: `## Bulk Product Sync Best Practices

When migrating merchants with large catalogs (>10k products):

1. Use the batch sync endpoint: \`POST /api/v2/products/batch\`
2. Implement exponential backoff starting at 1 second
3. Request temporary rate limit increase via support
4. Monitor sync progress via webhook events`,
    reason: 'Recurring issue ki-002 has occurred 7 times. Documentation prevents merchant confusion.',
    source_context: 'Multiple merchants have encountered rate limits during initial product sync. This is a recurring pattern during mid-migration phase.',
    status: 'pending',
    created_at: new Date(Date.now() - 300000).toISOString(),
  },
];

// ==========================================
// Mock Activity Feed
// ==========================================

export const mockActivityFeed = [
  {
    id: 'act-feed-001',
    type: 'signal',
    title: 'New checkout failure signal',
    description: 'Detected checkout failure for merchant m_123',
    timestamp: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: 'act-feed-002',
    type: 'pattern',
    title: 'Pattern detected',
    description: 'Spike in checkout failures: 27 merchants affected',
    timestamp: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'act-feed-003',
    type: 'reasoning',
    title: 'New reasoning cycle completed',
    description: 'Hypothesis: Migration webhook misconfiguration (72% confidence)',
    timestamp: new Date(Date.now() - 180000).toISOString(),
  },
  {
    id: 'act-feed-004',
    type: 'decision',
    title: 'Action proposed',
    description: 'Pending approval: Webhook configuration repair script',
    timestamp: new Date(Date.now() - 240000).toISOString(),
  },
  {
    id: 'act-feed-005',
    type: 'action',
    title: 'Action executed',
    description: 'Sent proactive message to 27 affected merchants',
    timestamp: new Date(Date.now() - 300000).toISOString(),
  },
];

// ==========================================
// Mock Migration Stage Distribution
// ==========================================

export const mockMigrationStageDistribution = [
  { stage: 'pre_migration', count: 45, percentage: 18 },
  { stage: 'mid_migration', count: 67, percentage: 27 },
  { stage: 'post_migration', count: 133, percentage: 55 },
];

// ==========================================
// Mock Merchants with Migration Stages
// ==========================================

export const mockMerchants: Merchant[] = [
  {
    id: 'm_101',
    name: 'Acme Electronics',
    migration_stage: 'post_migration',
    enabled_features: ['headless_checkout', 'custom_storefront', 'webhooks_v2'],
    failure_count_24h: 12,
    checkout_volume_24h: 1450,
    error_rate: 0.8,
    migrated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    region: 'us-east-1',
    last_failure: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'm_102',
    name: 'Fashion Forward',
    migration_stage: 'mid_migration',
    enabled_features: ['headless_checkout'],
    failure_count_24h: 34,
    checkout_volume_24h: 890,
    error_rate: 3.8,
    region: 'us-west-2',
    last_failure: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'm_103',
    name: 'Home Goods Plus',
    migration_stage: 'pre_migration',
    enabled_features: [],
    failure_count_24h: 2,
    checkout_volume_24h: 2100,
    error_rate: 0.1,
    region: 'eu-west-1',
  },
  {
    id: 'm_104',
    name: 'Tech Gadgets Inc',
    migration_stage: 'post_migration',
    enabled_features: ['headless_checkout', 'custom_storefront', 'webhooks_v2', 'realtime_inventory'],
    failure_count_24h: 8,
    checkout_volume_24h: 3200,
    error_rate: 0.25,
    migrated_at: new Date(Date.now() - 86400000 * 14).toISOString(),
    region: 'us-east-1',
  },
  {
    id: 'm_105',
    name: 'Outdoor Adventures',
    migration_stage: 'mid_migration',
    enabled_features: ['headless_checkout', 'webhooks_v2'],
    failure_count_24h: 67,
    checkout_volume_24h: 560,
    error_rate: 12.0,
    region: 'us-west-2',
    last_failure: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 'm_106',
    name: 'Beauty Essentials',
    migration_stage: 'pre_migration',
    enabled_features: [],
    failure_count_24h: 1,
    checkout_volume_24h: 1800,
    error_rate: 0.05,
    region: 'eu-central-1',
  },
  {
    id: 'm_107',
    name: 'Sports Direct',
    migration_stage: 'post_migration',
    enabled_features: ['headless_checkout', 'custom_storefront'],
    failure_count_24h: 23,
    checkout_volume_24h: 4500,
    error_rate: 0.5,
    migrated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    region: 'us-east-1',
    last_failure: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'm_108',
    name: 'Gourmet Foods Co',
    migration_stage: 'mid_migration',
    enabled_features: ['headless_checkout'],
    failure_count_24h: 89,
    checkout_volume_24h: 340,
    error_rate: 26.2,
    region: 'ap-southeast-1',
    last_failure: new Date(Date.now() - 60000).toISOString(),
  },
];

// ==========================================
// Mock Failure Events (Timeline)
// ==========================================

export const mockFailureEvents: MerchantFailureEvent[] = [
  // Post-migration failures spike right after migration
  { id: 'fe-001', merchant_id: 'm_101', timestamp: new Date(Date.now() - 86400000 * 6.9).toISOString(), error_type: 'webhook_timeout', migration_stage: 'post_migration', resolved: true },
  { id: 'fe-002', merchant_id: 'm_101', timestamp: new Date(Date.now() - 86400000 * 6.8).toISOString(), error_type: 'checkout_failure', migration_stage: 'post_migration', resolved: true },
  { id: 'fe-003', merchant_id: 'm_101', timestamp: new Date(Date.now() - 86400000 * 6.7).toISOString(), error_type: 'api_rate_limit', migration_stage: 'post_migration', resolved: true },
  // Mid-migration failures - active
  { id: 'fe-004', merchant_id: 'm_102', timestamp: new Date(Date.now() - 3600000).toISOString(), error_type: 'schema_mismatch', migration_stage: 'mid_migration', resolved: false },
  { id: 'fe-005', merchant_id: 'm_102', timestamp: new Date(Date.now() - 7200000).toISOString(), error_type: 'sync_failure', migration_stage: 'mid_migration', resolved: false },
  { id: 'fe-006', merchant_id: 'm_105', timestamp: new Date(Date.now() - 1800000).toISOString(), error_type: 'webhook_config_lost', migration_stage: 'mid_migration', resolved: false },
  { id: 'fe-007', merchant_id: 'm_105', timestamp: new Date(Date.now() - 900000).toISOString(), error_type: 'checkout_failure', migration_stage: 'mid_migration', resolved: false },
  { id: 'fe-008', merchant_id: 'm_108', timestamp: new Date(Date.now() - 300000).toISOString(), error_type: 'api_timeout', migration_stage: 'mid_migration', resolved: false },
  { id: 'fe-009', merchant_id: 'm_108', timestamp: new Date(Date.now() - 600000).toISOString(), error_type: 'product_sync_error', migration_stage: 'mid_migration', resolved: false },
  // Pre-migration (minimal failures)
  { id: 'fe-010', merchant_id: 'm_103', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), error_type: 'legacy_api_deprecation', migration_stage: 'pre_migration', resolved: true },
];

// ==========================================
// Failure Stats by Migration Stage
// ==========================================

export const mockFailureStatsByStage = {
  pre_migration: { total_failures: 3, avg_error_rate: 0.08, merchants_affected: 2 },
  mid_migration: { total_failures: 190, avg_error_rate: 14.0, merchants_affected: 3 },
  post_migration: { total_failures: 43, avg_error_rate: 0.52, merchants_affected: 3 },
};
