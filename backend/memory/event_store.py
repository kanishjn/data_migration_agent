"""
Event Store - Persistent storage for normalized migration signals.

All incoming signals are converted to a single event schema and stored
in the events table for downstream pattern detection and analysis.
"""

import json
import os
import sqlite3
from datetime import datetime, timedelta
from typing import Any, Optional

from utils.logger import api_logger


class EventStore:
    """
    Stores and retrieves normalized events for the observation layer.
    
    Events are normalized from various signal types (tickets, API errors,
    webhook failures, migration updates) into a unified schema.
    """

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("AGENT_DB_PATH", "memory/agent_state.sqlite")
        self._ensure_db_exists()

    def _ensure_db_exists(self) -> None:
        """Ensure database and events table exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_id TEXT,
            event_type TEXT NOT NULL,
            merchant_id TEXT,
            migration_stage TEXT,
            error_code TEXT,
            timestamp TEXT NOT NULL,
            raw_payload TEXT,
            source TEXT,
            processed INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_processed 
        ON events(processed)
        """)
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_timestamp 
        ON events(timestamp)
        """)
        cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_event_type 
        ON events(event_type)
        """)

        # Add signal_id column if missing (migration)
        cursor.execute("PRAGMA table_info(events)")
        columns = [row[1] for row in cursor.fetchall()]
        if "signal_id" not in columns:
            cursor.execute("ALTER TABLE events ADD COLUMN signal_id TEXT")

        conn.commit()
        conn.close()
        api_logger.debug("Event store initialized")

    def _to_iso_timestamp(self, val: Any) -> str:
        """Convert timestamp to ISO8601 string."""
        if val is None:
            return datetime.utcnow().isoformat() + "Z"
        if isinstance(val, datetime):
            return val.isoformat().replace("+00:00", "Z") if val.tzinfo else val.isoformat() + "Z"
        if isinstance(val, str):
            return val
        return str(val)

    def _normalize_event(self, raw: dict[str, Any]) -> dict[str, Any]:
        """
        Convert various signal formats to normalized event schema.
        
        Normalized schema:
        - event_type: str
        - merchant_id: str
        - migration_stage: str
        - error_code: str | None
        - timestamp: ISO8601 string
        - raw_text: str | None (human-readable summary)
        - source: str | None
        - raw_payload: JSON string (full original)
        """
        # Already normalized
        if "event_type" in raw and "merchant_id" in raw and "timestamp" in raw:
            return {
                "event_type": raw.get("event_type", "unknown"),
                "merchant_id": str(raw.get("merchant_id", "")),
                "migration_stage": raw.get("migration_stage", "unknown"),
                "error_code": raw.get("error_code"),
                "timestamp": self._to_iso_timestamp(raw.get("timestamp")),
                "raw_text": raw.get("raw_text") or raw.get("error_message", ""),
                "source": raw.get("source", "api"),
                "raw_payload": json.dumps(raw, default=str),
            }

        # API error format (from api_errors.json)
        if "error_code" in raw and "error_message" in raw:
            return {
                "event_type": "api_error",
                "merchant_id": str(raw.get("merchant_id", "")),
                "migration_stage": raw.get("migration_stage", "unknown"),
                "error_code": raw.get("error_code"),
                "timestamp": self._to_iso_timestamp(raw.get("timestamp") or raw.get("first_seen")),
                "raw_text": raw.get("error_message", ""),
                "source": raw.get("source", "api"),
                "raw_payload": json.dumps(raw, default=str),
            }

        # Support ticket format
        if "ticket_id" in raw or "description" in raw:
            return {
                "event_type": "support_ticket",
                "merchant_id": str(raw.get("merchant_id", "")),
                "migration_stage": raw.get("migration_stage", "unknown"),
                "error_code": raw.get("error_code"),
                "timestamp": self._to_iso_timestamp(raw.get("timestamp")),
                "raw_text": raw.get("description", raw.get("subject", "")),
                "source": raw.get("source", "support"),
                "raw_payload": json.dumps(raw, default=str),
            }

        # Webhook failure format
        if "webhook_id" in raw or "failure_reason" in raw:
            return {
                "event_type": "webhook_failure",
                "merchant_id": str(raw.get("merchant_id", "")),
                "migration_stage": raw.get("migration_stage", "unknown"),
                "error_code": raw.get("error_code"),
                "timestamp": self._to_iso_timestamp(raw.get("timestamp")),
                "raw_text": raw.get("failure_reason", ""),
                "source": raw.get("source", "webhook"),
                "raw_payload": json.dumps(raw, default=str),
            }

        # Migration update format
        if "current_stage" in raw or "previous_stage" in raw:
            stage = raw.get("current_stage", raw.get("previous_stage", "unknown"))
            if hasattr(stage, "value"):
                stage = stage.value
            return {
                "event_type": "migration_update",
                "merchant_id": str(raw.get("merchant_id", "")),
                "migration_stage": str(stage),
                "error_code": None,
                "timestamp": self._to_iso_timestamp(raw.get("timestamp")),
                "raw_text": raw.get("notes", ""),
                "source": raw.get("source", "migration"),
                "raw_payload": json.dumps(raw, default=str),
            }

        # Fallback - generic normalization
        return {
            "event_type": raw.get("event_type", "unknown"),
            "merchant_id": str(raw.get("merchant_id", "")),
            "migration_stage": raw.get("migration_stage", "unknown"),
            "error_code": raw.get("error_code"),
            "timestamp": self._to_iso_timestamp(raw.get("timestamp")),
            "raw_text": str(raw.get("raw_text", raw.get("error_message", ""))),
            "source": raw.get("source", "unknown"),
            "raw_payload": json.dumps(raw, default=str),
        }

    def save(self, raw_event: dict[str, Any], signal_id: Optional[str] = None) -> int:
        """
        Normalize and save an event to the events table.

        Args:
            raw_event: Raw event dict (various formats supported)
            signal_id: Optional external signal ID (e.g. SIG-xxx from API)

        Returns:
            event_id: The database ID of the saved event
        """
        event = self._normalize_event(raw_event)
        if signal_id:
            event["signal_id"] = signal_id
        # Handle migration_stage from metadata (API signals)
        if "migration_stage" not in event or event["migration_stage"] == "unknown":
            meta = raw_event.get("metadata") or {}
            if isinstance(meta, dict) and meta.get("migration_stage"):
                event["migration_stage"] = (
                    meta["migration_stage"].value
                    if hasattr(meta["migration_stage"], "value")
                    else str(meta["migration_stage"])
                )

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
        INSERT INTO events (signal_id, event_type, merchant_id, migration_stage, error_code, timestamp, raw_payload, source, processed)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
        """, (
            event.get("signal_id"),
            event["event_type"],
            event["merchant_id"],
            event["migration_stage"],
            event.get("error_code"),
            event["timestamp"],
            event.get("raw_payload", "{}"),
            event.get("source", "unknown"),
        ))

        event_id = cursor.lastrowid
        conn.commit()
        conn.close()

        api_logger.debug(f"Event saved: id={event_id} type={event['event_type']}")
        return event_id

    def save_batch(self, raw_events: list[dict[str, Any]], signal_ids: Optional[list[str]] = None) -> list[int]:
        """Save multiple events. Returns list of event IDs."""
        ids = []
        for i, raw in enumerate(raw_events):
            try:
                sid = signal_ids[i] if signal_ids and i < len(signal_ids) else None
                ids.append(self.save(raw, signal_id=sid))
            except Exception as e:
                api_logger.warning(f"Failed to save event: {e}")
        return ids

    def mark_processed_by_signal_id(self, signal_id: str) -> bool:
        """Mark event as processed by signal_id."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("UPDATE events SET processed = 1 WHERE signal_id = ?", (signal_id,))
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated

    def get_unprocessed(self, limit: int = 500) -> list[dict[str, Any]]:
        """Get events that haven't been processed by the observer."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        cursor.execute("""
        SELECT id, event_type, merchant_id, migration_stage, error_code, timestamp, raw_payload, source
        FROM events
        WHERE processed = 0
        ORDER BY timestamp ASC
        LIMIT ?
        """, (limit,))

        rows = cursor.fetchall()
        conn.close()

        events = []
        for row in rows:
            evt = dict(row)
            if evt.get("raw_payload"):
                try:
                    evt["raw_payload"] = json.loads(evt["raw_payload"])
                except json.JSONDecodeError:
                    pass
            # Include fields observer expects
            evt["merchant_id"] = evt.get("merchant_id") or ""
            evt["error_code"] = evt.get("error_code")
            evt["timestamp"] = evt.get("timestamp")
            payload = evt.get("raw_payload") or {}
            evt["endpoint"] = payload.get("endpoint", "")
            evt["source"] = evt.get("source", "unknown")
            evt["occurrence_count"] = payload.get("occurrence_count", 1)
            evt["http_status"] = payload.get("http_status", 200)
            events.append(evt)

        return events

    def mark_processed(self, event_ids: list[int]) -> None:
        """Mark events as processed."""
        if not event_ids:
            return

        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        placeholders = ",".join("?" * len(event_ids))
        cursor.execute(f"UPDATE events SET processed = 1 WHERE id IN ({placeholders})", event_ids)
        conn.commit()
        conn.close()
        api_logger.debug(f"Marked {len(event_ids)} events as processed")

    def get_by_id(self, event_id: int) -> Optional[dict[str, Any]]:
        """Get a single event by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM events WHERE id = ?", (event_id,))
        row = cursor.fetchone()
        conn.close()

        if row:
            evt = dict(row)
            if evt.get("raw_payload"):
                try:
                    evt["raw_payload"] = json.loads(evt["raw_payload"])
                except json.JSONDecodeError:
                    pass
            return evt
        return None

    def get_recent(
        self,
        limit: int = 100,
        hours: Optional[int] = None,
        event_type: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        """Get recent events with optional filters."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()

        query = "SELECT * FROM events WHERE 1=1"
        params: list[Any] = []

        if hours:
            cutoff = (datetime.utcnow() - timedelta(hours=hours)).isoformat()
            query += " AND timestamp >= ?"
            params.append(cutoff)

        if event_type:
            query += " AND event_type = ?"
            params.append(event_type)

        query += " ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()

        events = []
        for row in rows:
            evt = dict(row)
            if evt.get("raw_payload"):
                try:
                    evt["raw_payload"] = json.loads(evt["raw_payload"])
                except json.JSONDecodeError:
                    pass
            events.append(evt)

        return events

    def count_unprocessed(self) -> int:
        """Count unprocessed events."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM events WHERE processed = 0")
        count = cursor.fetchone()[0]
        conn.close()
        return count


# Singleton for use across the application
_event_store: Optional[EventStore] = None


def get_event_store() -> EventStore:
    """Get or create the event store singleton."""
    global _event_store
    if _event_store is None:
        _event_store = EventStore()
    return _event_store
