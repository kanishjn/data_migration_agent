"""
Actions API Routes - Human approval workflow for agent actions.

This module handles the human-in-the-loop approval process:
- Review proposed agent actions
- Approve or reject actions (with optional execution when approved)
- Log decisions for agent feedback/learning

The agent can propose actions, but cannot execute without human approval.
"""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, HTTPException, status

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import (
    ActionApprovalRequest,
    ActionApprovalResponse,
    ActionApproveBody,
    ActionStatus,
    ErrorResponse,
)
from api.routes.agent import _agent_state, get_current_state
from memory.memory_manager import MemoryManager
from utils.logger import log_approval_decision, action_logger


router = APIRouter(prefix="/actions", tags=["actions"])

# In-memory log of approval decisions (for backward compat / quick stats)
_approval_log: list[dict[str, Any]] = []


def get_memory() -> MemoryManager:
    return MemoryManager()


def _find_action(action_id: str) -> tuple[Optional[dict], Optional[int], str]:
    """Find action in agent state or memory. Returns (action, index, source)."""
    for i, a in enumerate(_agent_state.get("proposed_actions", [])):
        if a.get("action_id") == action_id:
            return a, i, "memory"
    memory = get_memory()
    db_action = memory.get_action_by_id(action_id)
    if db_action:
        return db_action, None, "db"
    return None, None, ""


@router.post(
    "/{action_id}/reject",
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def reject_action(
    action_id: str,
    body: Optional[ActionApproveBody] = None,
) -> dict[str, Any]:
    """Reject an action (explicit reject endpoint)."""
    b = body or ActionApproveBody(approved=False)
    return await _do_approve(
        ActionApprovalRequest(action_id=action_id, approved=False, reviewer=b.reviewer, feedback=b.feedback),
        execute_if_approved=False,
    )


@router.post(
    "/{action_id}/approve",
    responses={
        404: {"model": ErrorResponse, "description": "Action not found"},
        409: {"model": ErrorResponse, "description": "Action already processed"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def approve_action_by_id(
    action_id: str,
    body: Optional[ActionApproveBody] = None,
) -> dict[str, Any]:
    """
    Approve or reject action by ID (path parameter).

    When approved and execute_if_approved=true, executes the action via the action agent.
    """
    b = body or ActionApproveBody()
    return await _do_approve(
        ActionApprovalRequest(
            action_id=action_id,
            approved=b.approved,
            reviewer=b.reviewer,
            feedback=b.feedback,
        ),
        execute_if_approved=b.execute_if_approved,
    )


@router.post(
    "/approve",
    response_model=ActionApprovalResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Action not found"},
        409: {"model": ErrorResponse, "description": "Action already processed"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def approve_action(
    request: ActionApprovalRequest,
    execute_if_approved: bool = True,
) -> ActionApprovalResponse:
    """
    Approve or reject a proposed agent action (body with action_id).

    When approved and execute_if_approved=true, executes the action.
    """
    return await _do_approve(request, execute_if_approved=execute_if_approved)


async def _do_approve(
    request: ActionApprovalRequest,
    execute_if_approved: bool = True,
) -> dict[str, Any]:
    """Shared approval logic."""
    action_id = request.action_id
    action, action_index, source = _find_action(action_id)

    if action is None:
        action_logger.warning(f"Action not found: {action_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Action {action_id} not found"
        )

    current_status = action.get("status", "pending")
    if str(current_status).lower() != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Action {action_id} has already been {current_status}"
        )

    new_status = ActionStatus.APPROVED if request.approved else ActionStatus.REJECTED
    status_val = new_status.value if hasattr(new_status, "value") else str(new_status)

    # Update in-memory state
    if source == "memory" and action_index is not None:
        _agent_state["proposed_actions"][action_index]["status"] = status_val
        _agent_state["proposed_actions"][action_index]["reviewed_by"] = request.reviewer
        _agent_state["proposed_actions"][action_index]["reviewed_at"] = datetime.utcnow().isoformat()
        if request.feedback:
            _agent_state["proposed_actions"][action_index]["feedback"] = request.feedback

    # Update DB
    memory = get_memory()
    memory.update_action_status(
        action_id=action_id,
        status="approved" if request.approved else "rejected",
        reviewer=request.reviewer,
        feedback=request.feedback,
    )

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
    log_approval_decision(action_id, request.approved, request.reviewer)

    result = {"execution": None}
    if request.approved and execute_if_approved:
        try:
            from orchestrator.agent_orchestrator import AgentOrchestrator
            raw = action.get("raw_payload") or action.get("raw_action") or action
            decision = {
                "recommended_actions": [raw],
                "requires_human_approval": False,
            }
            orch = AgentOrchestrator(dry_run=True, use_llm=False)
            exec_result = orch.actor.act(decision, approved=True)
            result["execution"] = exec_result
        except Exception as e:
            action_logger.warning(f"Action execution failed: {e}")
            result["execution"] = {"status": "error", "message": str(e)}

    return {
        "action_id": action_id,
        "status": new_status,
        "message": f"Action {'approved' if request.approved else 'rejected'} successfully",
        "logged_at": datetime.utcnow(),
        **result,
    }


@router.get("/pending")
async def list_pending_actions() -> dict[str, Any]:
    """
    List all actions awaiting human approval.

    Merges in-memory agent state with persisted pending_actions from DB.
    """
    memory = get_memory()
    db_pending = memory.get_pending_actions(status_filter="pending")
    mem_pending = [
        a for a in _agent_state.get("proposed_actions", [])
        if str(a.get("status", "")).lower() == "pending"
    ]
    # Deduplicate by action_id (prefer DB as source of truth)
    seen = {a.get("action_id") for a in db_pending}
    for a in mem_pending:
        if a.get("action_id") not in seen:
            db_pending.append({
                "action_id": a.get("action_id"),
                "action_type": a.get("action_type"),
                "target": a.get("target"),
                "content": a.get("description"),
                "confidence": a.get("confidence"),
                "status": "pending",
            })
    db_pending.sort(key=lambda x: x.get("confidence", 0) or 0, reverse=True)
    return {"count": len(db_pending), "actions": db_pending}


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
