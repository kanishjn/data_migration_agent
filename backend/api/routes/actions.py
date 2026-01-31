"""
Actions API Routes - Human approval workflow for agent actions.

This module handles the human-in-the-loop approval process:
- Review proposed agent actions
- Approve or reject actions
- Log decisions for agent feedback/learning

The agent can propose actions, but cannot execute without human approval.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import (
    ActionApprovalRequest,
    ActionApprovalResponse,
    ActionStatus,
    ErrorResponse,
)
from api.routes.agent import _agent_state, get_current_state
from utils.logger import log_approval_decision, action_logger


router = APIRouter(prefix="/actions", tags=["actions"])

# In-memory log of approval decisions (for agent feedback loop)
_approval_log: list[dict[str, Any]] = []


@router.post(
    "/approve",
    response_model=ActionApprovalResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Action not found"},
        409: {"model": ErrorResponse, "description": "Action already processed"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def approve_action(request: ActionApprovalRequest) -> ActionApprovalResponse:
    """
    Approve or reject a proposed agent action.
    
    This is the human-in-the-loop control point. The agent proposes actions
    but cannot execute them without explicit human approval.
    
    The decision is logged for:
    - Audit trail
    - Agent feedback and learning
    - Compliance requirements
    """
    action_id = request.action_id
    
    # Find the action in agent state
    action = None
    action_index = None
    
    for i, a in enumerate(_agent_state.get("proposed_actions", [])):
        if a.get("action_id") == action_id:
            action = a
            action_index = i
            break
    
    if action is None:
        action_logger.warning(f"Action not found: {action_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action {action_id} not found"
        )
    
    # Check if already processed
    current_status = action.get("status")
    if current_status != ActionStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Action {action_id} has already been {current_status}"
        )
    
    # Update action status
    new_status = ActionStatus.APPROVED if request.approved else ActionStatus.REJECTED
    
    _agent_state["proposed_actions"][action_index]["status"] = new_status.value
    _agent_state["proposed_actions"][action_index]["reviewed_by"] = request.reviewer
    _agent_state["proposed_actions"][action_index]["reviewed_at"] = datetime.utcnow().isoformat()
    
    if request.feedback:
        _agent_state["proposed_actions"][action_index]["feedback"] = request.feedback
    
    # Log the decision
    log_approval_decision(action_id, request.approved, request.reviewer)
    
    # Store in approval log for feedback loop
    approval_record = {
        "action_id": action_id,
        "action_type": action.get("action_type"),
        "approved": request.approved,
        "reviewer": request.reviewer,
        "feedback": request.feedback,
        "original_confidence": action.get("confidence"),
        "decided_at": datetime.utcnow().isoformat(),
    }
    _approval_log.append(approval_record)
    
    decision_text = "approved" if request.approved else "rejected"
    action_logger.info(
        f"Action {action_id} {decision_text} by {request.reviewer}"
        f"{' with feedback' if request.feedback else ''}"
    )
    
    return ActionApprovalResponse(
        action_id=action_id,
        status=new_status,
        message=f"Action {decision_text} successfully",
        logged_at=datetime.utcnow(),
    )


@router.get("/pending")
async def list_pending_actions() -> dict[str, Any]:
    """
    List all actions awaiting human approval.
    
    Returns actions proposed by the agent that haven't been
    approved or rejected yet.
    """
    actions = _agent_state.get("proposed_actions", [])
    pending = [
        a for a in actions 
        if a.get("status") == ActionStatus.PENDING.value
    ]
    
    # Sort by confidence (highest first - most confident actions first)
    pending.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    
    return {
        "count": len(pending),
        "actions": pending
    }


@router.get("/history")
async def get_action_history(
    approved_only: bool = False,
    rejected_only: bool = False,
    limit: int = 100
) -> dict[str, Any]:
    """
    Get history of action decisions.
    
    Useful for:
    - Audit trail
    - Reviewing past decisions
    - Agent feedback analysis
    
    Args:
        approved_only: Only return approved actions
        rejected_only: Only return rejected actions
        limit: Maximum number of records
        
    Returns:
        List of action decisions
    """
    history = _approval_log.copy()
    
    if approved_only:
        history = [h for h in history if h.get("approved")]
    elif rejected_only:
        history = [h for h in history if not h.get("approved")]
    
    # Most recent first
    history.reverse()
    
    return {
        "count": len(history[:limit]),
        "total": len(_approval_log),
        "history": history[:limit]
    }


@router.get("/stats")
async def get_action_stats() -> dict[str, Any]:
    """
    Get statistics about action approvals.
    
    Returns:
        Approval/rejection rates and patterns
    """
    total_decisions = len(_approval_log)
    
    if total_decisions == 0:
        return {
            "total_decisions": 0,
            "approval_rate": 0.0,
            "by_action_type": {},
            "message": "No decisions recorded yet"
        }
    
    approved = len([a for a in _approval_log if a.get("approved")])
    rejected = total_decisions - approved
    
    # Stats by action type
    by_type: dict[str, dict[str, int]] = {}
    for record in _approval_log:
        action_type = record.get("action_type", "unknown")
        if action_type not in by_type:
            by_type[action_type] = {"approved": 0, "rejected": 0}
        
        if record.get("approved"):
            by_type[action_type]["approved"] += 1
        else:
            by_type[action_type]["rejected"] += 1
    
    return {
        "total_decisions": total_decisions,
        "approved": approved,
        "rejected": rejected,
        "approval_rate": round(approved / total_decisions, 3) if total_decisions > 0 else 0.0,
        "by_action_type": by_type,
        "pending_count": len([
            a for a in _agent_state.get("proposed_actions", [])
            if a.get("status") == ActionStatus.PENDING.value
        ])
    }


@router.get("/{action_id}")
async def get_action_details(action_id: str) -> dict[str, Any]:
    """
    Get details of a specific action.
    
    Args:
        action_id: The action identifier
        
    Returns:
        Full action details including status and feedback
    """
    for action in _agent_state.get("proposed_actions", []):
        if action.get("action_id") == action_id:
            return action
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Action {action_id} not found"
    )


# =============================================================================
# Helper Functions for Agent Modules
# =============================================================================

def get_approval_feedback(action_type: str | None = None) -> list[dict[str, Any]]:
    """
    Get approval feedback for agent learning.
    
    TODO: This function can be used by the agent to learn from
    human approval patterns and adjust confidence thresholds.
    
    Args:
        action_type: Optional filter by action type
        
    Returns:
        List of approval records with feedback
    """
    records = _approval_log
    
    if action_type:
        records = [r for r in records if r.get("action_type") == action_type]
    
    return [r for r in records if r.get("feedback")]


def clear_approval_log() -> None:
    """Clear the approval log (for testing)."""
    global _approval_log
    _approval_log = []
    action_logger.info("Approval log cleared")
