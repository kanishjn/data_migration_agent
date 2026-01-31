"""
Signals API Routes - Ingest incoming signals from various sources.

This module handles ingestion of:
- Support tickets
- API errors
- Webhook failures
- Migration status updates

Signals are stored/forwarded without interpretation.
Agent logic is handled by separate agent modules.
"""

import uuid
from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status

import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent.parent))

from api.schemas import (
    SignalIngestRequest,
    SignalIngestResponse,
    SignalType,
    ErrorResponse,
)
from utils.logger import log_signal_received, signal_logger


router = APIRouter(prefix="/signals", tags=["signals"])

# In-memory signal storage (would be replaced with proper storage in production)
# TODO: Agent orchestrator will consume these signals
_signal_store: list[dict[str, Any]] = []


@router.post(
    "/ingest",
    response_model=SignalIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid signal data"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
    },
)
async def ingest_signals(request: SignalIngestRequest) -> SignalIngestResponse:
    """
    Ingest incoming signals for agent processing.
    
    Accepts signals from various sources:
    - Support ticket systems (Zendesk, Intercom)
    - API monitoring (Datadog, CloudWatch)
    - Webhook delivery systems
    - Migration orchestration tools
    
    Signals are stored and made available to the agent observer module.
    This endpoint does NOT interpret or act on signals - that's the agent's job.
    """
    signal_ids = []
    
    try:
        for signal in request.signals:
            # Generate unique ID for tracking
            signal_id = f"SIG-{uuid.uuid4().hex[:12].upper()}"
            
            # Convert to storage format
            signal_record = {
                "signal_id": signal_id,
                "received_at": datetime.utcnow().isoformat(),
                "processed": False,  # TODO: Set by agent observer
                **signal.model_dump(),
            }
            
            # Store signal
            _signal_store.append(signal_record)
            signal_ids.append(signal_id)
            
            # Log receipt
            log_signal_received(
                signal_type=signal.signal_type.value,
                signal_id=signal_id,
                source=signal.source
            )
        
        signal_logger.info(f"Ingested {len(signal_ids)} signals successfully")
        
        return SignalIngestResponse(
            accepted=len(signal_ids),
            signal_ids=signal_ids,
            message=f"Successfully accepted {len(signal_ids)} signal(s) for processing"
        )
    
    except Exception as e:
        signal_logger.error(f"Failed to ingest signals: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest signals: {str(e)}"
        )


@router.get("/pending")
async def get_pending_signals(
    signal_type: SignalType | None = None,
    limit: int = 100
) -> dict[str, Any]:
    """
    Get pending (unprocessed) signals.
    
    This endpoint is used by the agent observer to fetch signals
    that haven't been processed yet.
    
    Args:
        signal_type: Optional filter by signal type
        limit: Maximum number of signals to return
        
    Returns:
        List of pending signals
    """
    pending = [s for s in _signal_store if not s.get("processed")]
    
    if signal_type:
        pending = [s for s in pending if s.get("signal_type") == signal_type.value]
    
    return {
        "count": len(pending[:limit]),
        "total_pending": len(pending),
        "signals": pending[:limit]
    }


@router.post("/mark-processed/{signal_id}")
async def mark_signal_processed(signal_id: str) -> dict[str, Any]:
    """
    Mark a signal as processed by the agent.
    
    Called by the agent observer after a signal has been analyzed.
    
    Args:
        signal_id: The signal to mark as processed
        
    Returns:
        Confirmation of the update
    """
    for signal in _signal_store:
        if signal.get("signal_id") == signal_id:
            signal["processed"] = True
            signal["processed_at"] = datetime.utcnow().isoformat()
            signal_logger.info(f"Signal {signal_id} marked as processed")
            return {
                "success": True,
                "signal_id": signal_id,
                "message": "Signal marked as processed"
            }
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Signal {signal_id} not found"
    )


@router.get("/stats")
async def get_signal_stats() -> dict[str, Any]:
    """
    Get statistics about ingested signals.
    
    Returns:
        Signal counts by type, status, etc.
    """
    total = len(_signal_store)
    processed = len([s for s in _signal_store if s.get("processed")])
    pending = total - processed
    
    by_type = {}
    for signal in _signal_store:
        sig_type = signal.get("signal_type", "unknown")
        by_type[sig_type] = by_type.get(sig_type, 0) + 1
    
    return {
        "total": total,
        "processed": processed,
        "pending": pending,
        "by_type": by_type
    }


# Helper function for agent modules to access signals
def get_all_signals() -> list[dict[str, Any]]:
    """Get all signals (for use by agent modules)."""
    return _signal_store.copy()


def clear_signals() -> None:
    """Clear all signals (for testing)."""
    global _signal_store
    _signal_store = []
