"""
Memory Manager for Agent State Persistence
Handles SQLite operations for incident tracking and confidence history.
"""

import sqlite3
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
import json


class MemoryManager:
    """
    Manages persistent storage of agent decisions and outcomes.
    
    Schema:
    - incidents: stores full incident lifecycle (signal -> root cause -> action -> outcome)
    - confidence_history: tracks confidence evolution over time
    """
    
    def __init__(self, db_path: Optional[str] = None):
        self.db_path = db_path or os.getenv("AGENT_DB_PATH", "memory/agent_state.sqlite")
        self._ensure_db_exists()
    
    def _ensure_db_exists(self):
        """Ensure database and tables exist."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_cluster TEXT,
            root_cause TEXT,
            confidence REAL,
            action_taken TEXT,
            outcome TEXT,
            observation_json TEXT,
            reasoning_json TEXT,
            pattern_summary TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS confidence_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            signal_cluster TEXT,
            confidence REAL,
            recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS pending_actions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_id TEXT UNIQUE NOT NULL,
            incident_id INTEGER,
            action_type TEXT,
            target TEXT,
            content TEXT,
            risk TEXT,
            severity TEXT,
            reasoning TEXT,
            evidence_summary TEXT,
            status TEXT DEFAULT 'pending',
            confidence REAL,
            raw_payload TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_by TEXT,
            reviewed_at TIMESTAMP,
            feedback TEXT,
            executed_at TIMESTAMP
        )
        """)
        
        conn.commit()
        conn.close()
    
    def record_incident(
        self,
        signal_cluster: str,
        root_cause: str,
        confidence: float,
        actions_taken: List[Dict[str, Any]],
        outcome: Optional[str] = None,
        observation: Optional[Dict[str, Any]] = None,
        reasoning: Optional[Dict[str, Any]] = None
    ) -> int:
        """
        Record a new incident with its diagnosis and actions.
        
        Args:
            signal_cluster: Description of the signal pattern/cluster
            root_cause: The diagnosed root cause
            confidence: Confidence level (0.0 to 1.0)
            actions_taken: List of actions executed
            outcome: Result of the actions (optional, can be updated later)
            observation: Full observation data with patterns
            reasoning: Full reasoning data with hypotheses
        
        Returns:
            incident_id: The database ID of the recorded incident
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Serialize actions as JSON
        actions_json = json.dumps(actions_taken, indent=2)
        observation_json = json.dumps(observation) if observation else None
        reasoning_json = json.dumps(reasoning) if reasoning else None
        
        # Generate pattern summary from observation
        pattern_summary = ""
        if observation and observation.get("patterns"):
            patterns = observation["patterns"]
            pattern_summary = f"{len(patterns)} patterns detected: "
            pattern_types = [p.get("pattern_type", "unknown") for p in patterns[:3]]
            pattern_summary += ", ".join(pattern_types)
        
        cursor.execute("""
        INSERT INTO incidents (signal_cluster, root_cause, confidence, action_taken, outcome, observation_json, reasoning_json, pattern_summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (signal_cluster, root_cause, confidence, actions_json, outcome, observation_json, reasoning_json, pattern_summary))
        
        incident_id = cursor.lastrowid
        conn.commit()
        
        # Also record in confidence history
        cursor.execute("""
        INSERT INTO confidence_history (signal_cluster, confidence)
        VALUES (?, ?)
        """, (signal_cluster, confidence))
        
        conn.commit()
        conn.close()
        
        return incident_id
    
    def update_incident_outcome(self, incident_id: int, outcome: str):
        """Update the outcome of an existing incident."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
        UPDATE incidents
        SET outcome = ?
        WHERE id = ?
        """, (outcome, incident_id))
        
        conn.commit()
        conn.close()
    
    def get_incident(self, incident_id: int) -> Optional[Dict[str, Any]]:
        """Retrieve a specific incident by ID."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT * FROM incidents WHERE id = ?
        """, (incident_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            incident = dict(row)
            # Parse actions JSON
            if incident.get('action_taken'):
                try:
                    incident['action_taken'] = json.loads(incident['action_taken'])
                except json.JSONDecodeError:
                    pass
            return incident
        return None
    
    def get_recent_incidents(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get the most recent incidents."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT * FROM incidents
        ORDER BY created_at DESC
        LIMIT ?
        """, (limit,))
        
        rows = cursor.fetchall()
        conn.close()
        
        incidents = []
        for row in rows:
            incident = dict(row)
            # Parse actions JSON
            if incident.get('action_taken'):
                try:
                    incident['action_taken'] = json.loads(incident['action_taken'])
                except json.JSONDecodeError:
                    pass
            # Parse observation JSON
            if incident.get('observation_json'):
                try:
                    incident['observation'] = json.loads(incident['observation_json'])
                except json.JSONDecodeError:
                    pass
            # Parse reasoning JSON
            if incident.get('reasoning_json'):
                try:
                    incident['reasoning'] = json.loads(incident['reasoning_json'])
                except json.JSONDecodeError:
                    pass
            incidents.append(incident)
        
        return incidents
    
    def get_similar_incidents(
        self,
        signal_cluster: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Find similar past incidents based on signal cluster.
        Uses simple text matching - could be enhanced with embeddings.
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Simple LIKE query - could be improved with FTS or embeddings
        cursor.execute("""
        SELECT * FROM incidents
        WHERE signal_cluster LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
        """, (f"%{signal_cluster}%", limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        incidents = []
        for row in rows:
            incident = dict(row)
            if incident.get('action_taken'):
                try:
                    incident['action_taken'] = json.loads(incident['action_taken'])
                except json.JSONDecodeError:
                    pass
            incidents.append(incident)
        
        return incidents
    
    def get_confidence_history(
        self,
        signal_cluster: Optional[str] = None,
        days: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Get confidence history, optionally filtered by signal cluster.
        
        Args:
            signal_cluster: Filter by signal cluster (optional)
            days: Number of days to look back
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if signal_cluster:
            cursor.execute("""
            SELECT * FROM confidence_history
            WHERE signal_cluster = ?
            AND recorded_at >= datetime('now', '-' || ? || ' days')
            ORDER BY recorded_at DESC
            """, (signal_cluster, days))
        else:
            cursor.execute("""
            SELECT * FROM confidence_history
            WHERE recorded_at >= datetime('now', '-' || ? || ' days')
            ORDER BY recorded_at DESC
            """, (days,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_success_rate_by_root_cause(self) -> Dict[str, Dict[str, Any]]:
        """
        Calculate success rates grouped by root cause.
        Useful for learning which diagnoses lead to successful outcomes.
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT 
            root_cause,
            COUNT(*) as total,
            SUM(CASE WHEN outcome LIKE '%success%' THEN 1 ELSE 0 END) as successes,
            AVG(confidence) as avg_confidence
        FROM incidents
        WHERE outcome IS NOT NULL
        GROUP BY root_cause
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        stats = {}
        for row in rows:
            root_cause, total, successes, avg_confidence = row
            stats[root_cause] = {
                "total_incidents": total,
                "successful_resolutions": successes,
                "success_rate": successes / total if total > 0 else 0,
                "average_confidence": avg_confidence
            }
        
        return stats
    
    def get_pending_actions(self, status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get pending actions from database.
        
        Args:
            status_filter: Filter by status ('pending', 'approved', 'rejected')
        
        Returns:
            List of action dicts
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if status_filter:
            cursor.execute("""
            SELECT * FROM pending_actions
            WHERE status = ?
            ORDER BY created_at DESC
            """, (status_filter,))
        else:
            cursor.execute("""
            SELECT * FROM pending_actions
            ORDER BY created_at DESC
            """)
        
        rows = cursor.fetchall()
        conn.close()
        
        actions = []
        for row in rows:
            action = dict(row)
            # Parse raw_payload if present
            if action.get('raw_payload'):
                try:
                    action['raw_payload'] = json.loads(action['raw_payload'])
                except json.JSONDecodeError:
                    pass
            actions.append(action)
        
        return actions
    
    def get_action_by_id(self, action_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific action by ID.
        
        Args:
            action_id: The action ID to retrieve
        
        Returns:
            Action dict or None
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
        SELECT * FROM pending_actions WHERE action_id = ?
        """, (action_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            action = dict(row)
            # Parse raw_payload if present
            if action.get('raw_payload'):
                try:
                    action['raw_payload'] = json.loads(action['raw_payload'])
                except json.JSONDecodeError:
                    pass
            return action
        return None
    
    def update_action_status(
        self,
        action_id: str,
        status: str,
        reviewer: Optional[str] = None,
        feedback: Optional[str] = None
    ):
        """
        Update the status of an action.
        
        Args:
            action_id: The action ID to update
            status: New status ('approved', 'rejected', 'pending')
            reviewer: Who reviewed the action
            feedback: Optional feedback text
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
        UPDATE pending_actions
        SET status = ?,
            reviewed_by = ?,
            feedback = ?,
            reviewed_at = ?
        WHERE action_id = ?
        """, (status, reviewer, feedback, datetime.utcnow().isoformat(), action_id))
        
        conn.commit()
        conn.close()
    
    def create_pending_action(
        self,
        action_id: str,
        action_type: str,
        target: Optional[str] = None,
        content: Optional[str] = None,
        confidence: Optional[float] = None,
        raw_payload: Optional[Dict[str, Any]] = None,
        incident_id: Optional[int] = None,
        risk: Optional[str] = None,
        severity: Optional[str] = None,
        reasoning: Optional[str] = None,
    ) -> str:
        """
        Create a new pending action in the database.

        Returns:
            action_id
        """
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        raw_json = json.dumps(raw_payload) if raw_payload else None

        cursor.execute("""
        INSERT OR REPLACE INTO pending_actions
        (action_id, incident_id, action_type, target, content, risk, severity, reasoning, confidence, raw_payload, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
        """, (action_id, incident_id, action_type, target or "general", content, risk, severity, reasoning, confidence, raw_json))
        
        conn.commit()
        conn.close()
        
        return action_id
    
    def close(self):
        """Close any open connections (for cleanup)."""
        pass  # Using context managers, no persistent connection
