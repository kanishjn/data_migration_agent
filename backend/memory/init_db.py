"""
Initialize the agent state database with all required tables.

Run: python -m memory.init_db
"""

import sqlite3
import os

DB_PATH = os.getenv("AGENT_DB_PATH", "memory/agent_state.sqlite")

# Ensure memory directory exists
os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
CREATE TABLE IF NOT EXISTS incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_cluster TEXT,
    root_cause TEXT,
    confidence REAL,
    action_taken TEXT,
    outcome TEXT,
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

cursor.execute("""
CREATE TABLE IF NOT EXISTS hypotheses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER,
    primary_hypothesis TEXT,
    alternative_hypotheses TEXT,
    unknowns TEXT,
    confidence REAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

cursor.execute("""
CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    incident_id INTEGER NOT NULL,
    feedback_type TEXT NOT NULL,
    corrected_cause TEXT,
    reviewer TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
""")

conn.commit()
conn.close()

print("Agent memory database initialized (incidents, events, pending_actions, hypotheses, feedback).")