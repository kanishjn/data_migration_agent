import sqlite3
import os

DB_PATH = os.getenv("AGENT_DB_PATH", "memory/agent_state.sqlite")

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

conn.commit()
conn.close()

print("Agent memory database initialized.")