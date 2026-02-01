"""
Incidents API Routes - Query incident history and details.

Provides endpoints for:
- Listing recent incidents
- Getting incident details (observation, reasoning, evidence)
- Submitting human feedback on hypotheses
"""

from typing import Any, Optional

from fastapi import APIRouter, HTTPException, Query, status

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import ErrorResponse, IncidentFeedbackRequest
from memory.memory_manager import MemoryManager
from utils.logger import api_logger


router = APIRouter(prefix="/incidents", tags=["incidents"])

_memory: Optional[MemoryManager] = None


def get_memory() -> MemoryManager:
    global _memory
    if _memory is None:
        _memory = MemoryManager()
    return _memory


@router.get("", summary="List recent incidents")
async def list_incidents(
    limit: int = Query(default=20, ge=1, le=100, description="Max incidents to return"),
    min_confidence: Optional[float] = Query(default=None, ge=0, le=1),
) -> dict[str, Any]:
    """
    List recent incidents with optional filtering.

    Returns incidents with their root cause, confidence, and pattern summary.
    """
    memory = get_memory()
    incidents = memory.get_recent_incidents(limit=limit)

    if min_confidence is not None:
        incidents = [i for i in incidents if (i.get("confidence") or 0) >= min_confidence]

    return {
        "count": len(incidents),
        "incidents": incidents,
    }


@router.get("/patterns", summary="Get current detected patterns")
async def get_current_patterns() -> dict[str, Any]:
    """
    Get summary of current patterns from most recent incident.

    Useful for dashboard "current situation" display.
    """
    memory = get_memory()
    incidents = memory.get_recent_incidents(limit=1)

    if not incidents:
        return {
            "patterns": [],
            "summary": "No recent incidents",
        }

    inc = incidents[0]
    observation = inc.get("observation") or inc.get("observation_json")
    if isinstance(observation, str):
        try:
            import json
            observation = json.loads(observation)
        except Exception:
            observation = None

    patterns = observation.get("patterns", []) if observation else []
    summary = inc.get("pattern_summary") or ""

    return {
        "patterns": patterns,
        "summary": summary,
        "incident_id": inc.get("id"),
        "root_cause": inc.get("root_cause"),
        "confidence": inc.get("confidence"),
    }


@router.get("/{incident_id}", summary="Get incident details")
async def get_incident(incident_id: int) -> dict[str, Any]:
    """
    Get full incident details including:
    - Observation (patterns detected)
    - Reasoning (hypotheses, evidence)
    - Recommended actions
    - Human feedback (if any)
    """
    memory = get_memory()
    incident = memory.get_incident(incident_id)

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found",
        )

    # Get feedback for this incident
    feedback = memory.get_feedback_for_incident(incident_id)
    incident["feedback"] = feedback

    return incident


@router.post("/{incident_id}/feedback", summary="Submit feedback on incident")
async def submit_feedback(incident_id: int, request: IncidentFeedbackRequest) -> dict[str, Any]:
    """
    Submit human feedback on incident correctness.

    Feedback types: correct, wrong_cause, partial

    This feedback is stored for agent learning and future reasoning.
    """
    if request.feedback_type not in ("correct", "wrong_cause", "partial"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="feedback_type must be one of: correct, wrong_cause, partial",
        )

    memory = get_memory()
    incident = memory.get_incident(incident_id)

    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident {incident_id} not found",
        )

    fid = memory.add_feedback(
        incident_id=incident_id,
        feedback_type=request.feedback_type,
        corrected_cause=request.corrected_cause,
        reviewer=request.reviewer,
        notes=request.notes,
    )

    api_logger.info(f"Feedback recorded: incident={incident_id} type={request.feedback_type}")

    return {
        "success": True,
        "feedback_id": fid,
        "incident_id": incident_id,
        "feedback_type": request.feedback_type,
    }
