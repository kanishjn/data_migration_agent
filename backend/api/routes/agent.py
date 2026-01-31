"""
Agent API Routes - Get agent state and decisions.

This module provides endpoints to query the agent's current state,
including detected issues, confidence levels, and proposed actions.

NOTE: The actual agent logic is implemented in separate agent modules.
This route layer simply exposes agent state via API.
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import (
    AgentStateResponse,
    DetectedIssue,
    ProposedAction,
    ActionType,
    ActionStatus,
    ErrorResponse,
)
from utils.logger import api_logger


router = APIRouter(prefix="/agent", tags=["agent"])


# =============================================================================
# Agent State Storage
# =============================================================================
# This is a placeholder for agent state that will be populated by agent modules.
# The agent orchestrator (implemented by another teammate) will update this state.

_agent_state: dict[str, Any] = {
    "detected_issues": [],
    "proposed_actions": [],
    "assumptions": [],
    "overall_confidence": 0.0,
    "last_updated": None,
    "agent_status": "idle",
    "cycle_count": 0,
}


# =============================================================================
# API Endpoints
# =============================================================================

@router.get(
    "/state",
    response_model=AgentStateResponse,
    responses={
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def get_agent_state() -> AgentStateResponse:
    """
    Get the agent's current state.
    
    Returns the agent's current understanding including:
    - Detected issues and their confidence levels
    - Proposed actions awaiting approval
    - Assumptions made by the agent
    - Overall system health confidence
    
    NOTE: This state is populated by the agent orchestrator module.
    If the agent hasn't run, this will return default/empty values.
    """
    api_logger.info("Agent state requested")
    
    return AgentStateResponse(
        detected_issues=[DetectedIssue(**i) for i in _agent_state.get("detected_issues", [])],
        proposed_actions=[ProposedAction(**a) for a in _agent_state.get("proposed_actions", [])],
        assumptions=_agent_state.get("assumptions", []),
        overall_confidence=_agent_state.get("overall_confidence", 0.0),
        last_updated=_agent_state.get("last_updated") or datetime.utcnow(),
        agent_status=_agent_state.get("agent_status", "idle"),
    )


@router.get("/issues")
async def get_detected_issues(
    min_confidence: float = 0.0,
    limit: int = 50
) -> dict[str, Any]:
    """
    Get detected issues with optional filtering.
    
    Args:
        min_confidence: Minimum confidence threshold (0.0 to 1.0)
        limit: Maximum number of issues to return
        
    Returns:
        List of detected issues meeting criteria
    """
    issues = _agent_state.get("detected_issues", [])
    
    # Filter by confidence
    filtered = [i for i in issues if i.get("confidence", 0) >= min_confidence]
    
    # Sort by confidence (highest first)
    filtered.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    
    return {
        "count": len(filtered[:limit]),
        "total": len(issues),
        "issues": filtered[:limit]
    }


@router.get("/actions/pending")
async def get_pending_actions() -> dict[str, Any]:
    """
    Get proposed actions awaiting human approval.
    
    Returns actions that the agent has proposed but haven't been
    approved or rejected yet.
    """
    actions = _agent_state.get("proposed_actions", [])
    pending = [a for a in actions if a.get("status") == ActionStatus.PENDING.value]
    
    return {
        "count": len(pending),
        "actions": pending
    }


@router.get("/status")
async def get_agent_status() -> dict[str, Any]:
    """
    Get a quick summary of agent status.
    
    Returns:
        Agent status summary
    """
    return {
        "status": _agent_state.get("agent_status", "idle"),
        "cycle_count": _agent_state.get("cycle_count", 0),
        "last_updated": _agent_state.get("last_updated"),
        "pending_issues": len(_agent_state.get("detected_issues", [])),
        "pending_actions": len([
            a for a in _agent_state.get("proposed_actions", [])
            if a.get("status") == ActionStatus.PENDING.value
        ]),
        "overall_confidence": _agent_state.get("overall_confidence", 0.0)
    }


# =============================================================================
# Functions for Agent Modules to Update State
# =============================================================================
# These functions are called by the agent orchestrator (another teammate's work)
# to update the state that this API exposes.

def update_agent_state(
    detected_issues: list[dict] | None = None,
    proposed_actions: list[dict] | None = None,
    assumptions: list[str] | None = None,
    overall_confidence: float | None = None,
    agent_status: str | None = None,
) -> None:
    """
    Update the agent state (called by agent orchestrator).
    
    TODO: This function will be called by the agent orchestrator module
    to update state after each observe-reason-decide cycle.
    """
    global _agent_state
    
    if detected_issues is not None:
        _agent_state["detected_issues"] = detected_issues
    
    if proposed_actions is not None:
        _agent_state["proposed_actions"] = proposed_actions
    
    if assumptions is not None:
        _agent_state["assumptions"] = assumptions
    
    if overall_confidence is not None:
        _agent_state["overall_confidence"] = overall_confidence
    
    if agent_status is not None:
        _agent_state["agent_status"] = agent_status
    
    _agent_state["last_updated"] = datetime.utcnow().isoformat()
    _agent_state["cycle_count"] = _agent_state.get("cycle_count", 0) + 1
    
    api_logger.info(f"Agent state updated: status={agent_status}, issues={len(detected_issues or [])}")


def add_proposed_action(action: dict) -> str:
    """
    Add a proposed action to the agent state.
    
    Returns:
        The action_id of the added action
    """
    import uuid
    
    if "action_id" not in action:
        action["action_id"] = f"ACT-{uuid.uuid4().hex[:8].upper()}"
    
    if "status" not in action:
        action["status"] = ActionStatus.PENDING.value
    
    if "created_at" not in action:
        action["created_at"] = datetime.utcnow().isoformat()
    
    _agent_state["proposed_actions"].append(action)
    _agent_state["last_updated"] = datetime.utcnow().isoformat()
    
    api_logger.info(f"Proposed action added: {action['action_id']}")
    
    return action["action_id"]


def get_current_state() -> dict[str, Any]:
    """Get the current agent state (for use by agent modules)."""
    return _agent_state.copy()


def reset_agent_state() -> None:
    """Reset agent state to initial values (for testing)."""
    global _agent_state
    _agent_state = {
        "detected_issues": [],
        "proposed_actions": [],
        "assumptions": [],
        "overall_confidence": 0.0,
        "last_updated": None,
        "agent_status": "idle",
        "cycle_count": 0,
    }
    api_logger.info("Agent state reset")
