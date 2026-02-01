"""
Pydantic schemas for API request/response models.

These schemas define the contract between the backend APIs and consumers
(including the agent modules that will be implemented by another teammate).
"""

from datetime import datetime
from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# =============================================================================
# Enums
# =============================================================================

class SignalType(str, Enum):
    """Types of signals that can be ingested."""
    SUPPORT_TICKET = "support_ticket"
    API_ERROR = "api_error"
    WEBHOOK_FAILURE = "webhook_failure"
    MIGRATION_UPDATE = "migration_update"


class SignalSeverity(str, Enum):
    """Severity levels for incoming signals."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ActionType(str, Enum):
    """Types of actions the agent can propose."""
    ESCALATE_JIRA = "escalate_jira"
    ESCALATE_SLACK = "escalate_slack"
    UPDATE_TICKET = "update_ticket"
    PROPOSE_DOC_UPDATE = "propose_doc_update"
    NOTIFY_MERCHANT = "notify_merchant"
    FLAG_FOR_REVIEW = "flag_for_review"


class ActionStatus(str, Enum):
    """Status of a proposed action."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXECUTED = "executed"


class MigrationStage(str, Enum):
    """Merchant migration stages."""
    PRE_MIGRATION = "pre_migration"
    IN_PROGRESS = "in_progress"
    POST_MIGRATION = "post_migration"
    ROLLBACK = "rollback"


# =============================================================================
# Signal Schemas
# =============================================================================

class SignalBase(BaseModel):
    """Base schema for all incoming signals."""
    signal_type: SignalType
    source: str = Field(..., description="Origin system (e.g., 'zendesk', 'datadog')")
    severity: SignalSeverity = SignalSeverity.MEDIUM
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SupportTicketSignal(SignalBase):
    """Signal from a support ticket system."""
    signal_type: SignalType = SignalType.SUPPORT_TICKET
    ticket_id: str
    merchant_id: str
    subject: str
    description: str
    tags: list[str] = Field(default_factory=list)


class APIErrorSignal(SignalBase):
    """Signal from API error monitoring."""
    signal_type: SignalType = SignalType.API_ERROR
    error_code: str
    endpoint: str
    merchant_id: Optional[str] = None
    error_message: str
    stack_trace: Optional[str] = None
    occurrence_count: int = 1


class WebhookFailureSignal(SignalBase):
    """Signal from webhook delivery failures."""
    signal_type: SignalType = SignalType.WEBHOOK_FAILURE
    webhook_id: str
    merchant_id: str
    event_type: str
    failure_reason: str
    retry_count: int = 0
    expected_version: Optional[str] = None
    actual_version: Optional[str] = None


class MigrationUpdateSignal(SignalBase):
    """Signal about merchant migration status changes."""
    signal_type: SignalType = SignalType.MIGRATION_UPDATE
    merchant_id: str
    previous_stage: Optional[MigrationStage] = None
    current_stage: MigrationStage
    notes: Optional[str] = None


class SignalIngestRequest(BaseModel):
    """Request body for POST /signals/ingest."""
    signals: list[
        SupportTicketSignal | APIErrorSignal | WebhookFailureSignal | MigrationUpdateSignal
    ] = Field(..., min_length=1)


class SignalIngestResponse(BaseModel):
    """Response for POST /signals/ingest."""
    accepted: int
    signal_ids: list[str]
    message: str = "Signals accepted for processing"


# =============================================================================
# Agent State Schemas
# =============================================================================

class DetectedIssue(BaseModel):
    """An issue detected by the agent."""
    issue_id: str
    description: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    related_signals: list[str] = Field(default_factory=list)
    detected_at: datetime = Field(default_factory=datetime.utcnow)


class ProposedAction(BaseModel):
    """An action proposed by the agent."""
    action_id: str
    action_type: ActionType
    description: str
    target: str = Field(..., description="Target of the action (e.g., ticket ID, merchant ID)")
    confidence: float = Field(..., ge=0.0, le=1.0)
    requires_approval: bool = True
    status: ActionStatus = ActionStatus.PENDING
    reasoning: Optional[str] = Field(None, description="Agent's reasoning (populated by agent module)")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AgentStateResponse(BaseModel):
    """Response for GET /agent/state."""
    # TODO: These fields will be populated by the agent orchestrator module
    detected_issues: list[DetectedIssue] = Field(default_factory=list)
    proposed_actions: list[ProposedAction] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    overall_confidence: float = Field(0.0, ge=0.0, le=1.0)
    last_updated: datetime = Field(default_factory=datetime.utcnow)
    agent_status: str = "idle"  # idle, observing, reasoning, deciding, acting


# =============================================================================
# Action Approval Schemas
# =============================================================================

class ActionApprovalRequest(BaseModel):
    """Request body for POST /actions/approve."""
    action_id: str
    approved: bool
    reviewer: str = Field(..., description="Identifier of the human reviewer")
    feedback: Optional[str] = Field(None, description="Optional feedback for agent learning")


class ActionApproveBody(BaseModel):
    """Request body for POST /actions/{action_id}/approve."""
    approved: bool = True
    reviewer: str = Field("api", description="Identifier of the reviewer")
    feedback: Optional[str] = Field(None, description="Optional feedback")
    execute_if_approved: bool = Field(True, description="Execute action when approved")


class ActionApprovalResponse(BaseModel):
    """Response for POST /actions/approve."""
    action_id: str
    status: ActionStatus
    message: str
    logged_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Simulation Schemas
# =============================================================================

class SimulationDataType(str, Enum):
    """Types of simulation data available."""
    TICKETS = "tickets"
    API_ERRORS = "api_errors"
    WEBHOOK_FAILURES = "webhook_failures"
    MIGRATION_STATES = "migration_states"
    ALL = "all"


class SimulationLoadRequest(BaseModel):
    """Request parameters for GET /simulations/load."""
    data_type: SimulationDataType = SimulationDataType.ALL


class SimulationLoadResponse(BaseModel):
    """Response for GET /simulations/load."""
    data_type: str
    record_count: int
    data: list[dict[str, Any]]
    loaded_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Common Response Schemas
# =============================================================================

class HealthResponse(BaseModel):
    """Response for health check endpoint."""
    status: str = "healthy"
    version: str = "0.1.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# Incident Feedback Schemas
# =============================================================================

class IncidentFeedbackRequest(BaseModel):
    """Request body for POST /incidents/{id}/feedback."""
    feedback_type: str = Field(..., description="correct, wrong_cause, or partial")
    corrected_cause: Optional[str] = Field(None, description="Correct root cause if wrong_cause/partial")
    reviewer: str = Field("api", description="Identifier of the reviewer")
    notes: Optional[str] = Field(None, description="Additional notes")
