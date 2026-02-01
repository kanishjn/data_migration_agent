"""
Signals API Routes - Ingest incoming signals from various sources.

This module handles ingestion of:
- Support tickets
- API errors
- Webhook failures
- Migration status updates

Signals are normalized and persisted to the event store.
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
from memory.event_store import get_event_store
from utils.logger import log_signal_received, signal_logger


router = APIRouter(prefix="/signals", tags=["signals"])


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

    Signals are normalized and persisted to the event store.
    The background worker processes them for pattern detection.
    """
    signal_ids = []
    event_store = get_event_store()

    try:
        for signal in request.signals:
            signal_id = f"SIG-{uuid.uuid4().hex[:12].upper()}"
            raw = signal.model_dump(mode="json")
            raw["signal_id"] = signal_id

            event_store.save(raw, signal_id=signal_id)
            signal_ids.append(signal_id)

            log_signal_received(
                signal_type=signal.signal_type.value,
                signal_id=signal_id,
                source=signal.source
            )

        signal_logger.info(f"Ingested {len(signal_ids)} signals to event store")

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


@router.post("/ingest/raw", status_code=status.HTTP_202_ACCEPTED)
async def ingest_raw_events(events: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Ingest raw normalized events (webhook-style).

    Accepts events in normalized schema:
    - event_type, merchant_id, migration_stage, error_code, timestamp, raw_text
    """
    event_store = get_event_store()
    try:
        ids = event_store.save_batch(events)
        return {
            "accepted": len(ids),
            "event_ids": ids,
            "message": f"Successfully accepted {len(ids)} event(s)"
        }
    except Exception as e:
        signal_logger.error(f"Failed to ingest raw events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/all")
async def get_all_signals(
    limit: int = 100,
    hours: int | None = None,
    event_type: str | None = None
) -> dict[str, Any]:
    """
    Get all recent signals (both processed and unprocessed) from the event store.
    
    Args:
        limit: Maximum number of signals to return (default: 100)
        hours: Optional filter to get signals from last N hours
        event_type: Optional filter by event type
    """
    event_store = get_event_store()
    events = event_store.get_recent(limit=limit, hours=hours, event_type=event_type)
    signal_logger.info(f"Retrieved {len(events)} signals (all)")
    return {
        "count": len(events),
        "total_pending": event_store.count_unprocessed(),
        "signals": events
    }


@router.get("/pending")
async def get_pending_signals(
    signal_type: SignalType | None = None,
    limit: int = 100
) -> dict[str, Any]:
    """
    Get pending (unprocessed) events from the event store.
    """
    event_store = get_event_store()
    events = event_store.get_unprocessed(limit=limit)

    if signal_type:
        events = [e for e in events if e.get("event_type") == signal_type.value]

    return {
        "count": len(events),
        "total_pending": event_store.count_unprocessed(),
        "signals": events
    }


@router.post("/mark-processed/{signal_id}")
async def mark_signal_processed(signal_id: str) -> dict[str, Any]:
    """Mark a signal as processed by signal_id."""
    event_store = get_event_store()
    ok = event_store.mark_processed_by_signal_id(signal_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Signal {signal_id} not found"
        )
    signal_logger.info(f"Signal {signal_id} marked as processed")
    return {"success": True, "signal_id": signal_id, "message": "Signal marked as processed"}


@router.get("/stats")
async def get_signal_stats() -> dict[str, Any]:
    """Get statistics about ingested events."""
    event_store = get_event_store()
    unprocessed = event_store.count_unprocessed()
    recent = event_store.get_recent(limit=1000)
    total = len(recent) + unprocessed  # Approximate
    by_type = {}
    for e in recent:
        t = e.get("event_type", "unknown")
        by_type[t] = by_type.get(t, 0) + 1
    return {
        "total": total,
        "processed": max(0, total - unprocessed),
        "pending": unprocessed,
        "by_type": by_type
    }


def get_all_signals() -> list[dict[str, Any]]:
    """Get unprocessed events (for backward compatibility)."""
    return get_event_store().get_unprocessed(limit=500)
