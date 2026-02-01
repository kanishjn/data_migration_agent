# Database & Persistence Layer

## Overview

The agent now stores all incidents, decisions, and actions in a persistent SQLite database. This enables:
- **Historical analysis** of patterns and resolutions
- **Learning from past incidents** to improve future decisions
- **Audit trails** for compliance and debugging
- **Confidence tracking** over time
- **Success rate analysis** by root cause

## Database Schema

### Tables

#### `incidents`
Stores complete incident lifecycle from detection to resolution.

```sql
CREATE TABLE incidents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_cluster TEXT,           -- Description of the pattern detected
    root_cause TEXT,                -- Diagnosed root cause
    confidence REAL,                -- Confidence level (0.0 to 1.0)
    action_taken TEXT,              -- JSON array of actions executed
    outcome TEXT,                   -- Result: "pending", "completed", "partial_failure", etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

#### `confidence_history`
Tracks confidence levels over time for pattern analysis.

```sql
CREATE TABLE confidence_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_cluster TEXT,           -- Pattern identifier
    confidence REAL,               -- Confidence level (0.0 to 1.0)
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Usage

### Initialization

```bash
# Initialize database (creates tables if they don't exist)
python memory/init_db.py
```

### Programmatic Access

```python
from memory.memory_manager import MemoryManager

# Initialize manager
memory = MemoryManager()

# Record an incident
incident_id = memory.record_incident(
    signal_cluster="error_cluster | Error: PAYMENT_CALLBACK_INVALID | Merchants: 3",
    root_cause="Callback configuration error",
    confidence=0.85,
    actions_taken=[
        {"type": "engineering_escalation", "success": True},
        {"type": "merchant_communication", "success": True}
    ],
    outcome="completed"
)

# Query recent incidents
recent = memory.get_recent_incidents(limit=10)

# Find similar past incidents
similar = memory.get_similar_incidents("PAYMENT_CALLBACK_INVALID")

# Get confidence trends
history = memory.get_confidence_history(days=30)

# Analyze success rates
stats = memory.get_success_rate_by_root_cause()
```

### View Database Contents

```bash
# View all stored incidents
python view_incidents.py
```

This displays:
- Recent incidents with full details
- Confidence history trends
- Success rates by root cause
- Action execution summaries

## Integration with ActionAgent

The `ActionAgent` automatically stores incidents when executing actions:

```python
from agents.action_agent import ActionAgent

agent = ActionAgent(dry_run=True, use_llm=True)

# Pass observation and reasoning for database storage
result = agent.act(
    decision=decision,
    approved=True,
    observation=observation,  # ← Required for signal cluster
    reasoning=reasoning       # ← Required for root cause
)

# Incident ID is returned
print(f"Incident #{result['incident_id']} recorded")
```

### What Gets Stored

When `act()` is called with `observation` and `reasoning`:

1. **Before execution**: Creates incident record with:
   - Signal cluster description (extracted from observation)
   - Root cause (from reasoning hypothesis)
   - Confidence level
   - Status: "pending"

2. **After execution**: Updates incident with:
   - All actions executed (full JSON)
   - Outcome: "completed", "partial_failure", or "pending_approval"
   - Final status

## Database Location

Default path: `backend/memory/agent_state.sqlite`

Override with environment variable:
```bash
export AGENT_DB_PATH=/custom/path/to/database.sqlite
```

## Memory Manager API

### Core Methods

#### `record_incident(signal_cluster, root_cause, confidence, actions_taken, outcome=None)`
Record a new incident.

**Returns**: `incident_id` (int)

#### `update_incident_outcome(incident_id, outcome)`
Update the outcome of an existing incident.

#### `get_incident(incident_id)`
Retrieve a specific incident by ID.

**Returns**: Dict or None

#### `get_recent_incidents(limit=10)`
Get the most recent incidents.

**Returns**: List of incident dicts

#### `get_similar_incidents(signal_cluster, limit=5)`
Find similar past incidents based on signal pattern.

**Returns**: List of incident dicts

#### `get_confidence_history(signal_cluster=None, days=30)`
Get confidence tracking history.

**Returns**: List of confidence records

#### `get_success_rate_by_root_cause()`
Calculate success rates grouped by diagnosed root cause.

**Returns**: Dict mapping root_cause → stats

## Example Output

### Incident Record
```json
{
  "id": 4,
  "signal_cluster": "error_cluster | Severity: medium | Error: PAYMENT_CALLBACK_INVALID | Merchants: 3",
  "root_cause": "Callback configuration error",
  "confidence": 0.85,
  "outcome": "completed",
  "created_at": "2026-01-31 19:47:55",
  "action_taken": [
    {
      "action_type": "engineering_escalation",
      "success": true,
      "jira_ticket": {"jira_id": "MIG-E965C7"}
    },
    {
      "action_type": "proactive_merchant_communication",
      "success": true,
      "target_merchant_count": 3
    },
    {
      "action_type": "incident_report_draft",
      "success": true
    }
  ]
}
```

### Success Rate Stats
```json
{
  "Callback configuration error": {
    "total_incidents": 2,
    "successful_resolutions": 2,
    "success_rate": 1.0,
    "average_confidence": 0.85
  }
}
```

## Future Enhancements

Potential improvements to the memory system:

1. **Embedding-based similarity search** instead of text matching
2. **Automatic learning**: adjust confidence thresholds based on historical success rates
3. **Anomaly detection**: flag unusual patterns based on history
4. **Time-series analysis**: predict incident likelihood
5. **Feedback loop**: update confidence when human validates/rejects diagnosis
6. **Multi-database support**: PostgreSQL for production scale
7. **Data retention policies**: archive old incidents
8. **Export/import**: migrate data between environments

## Files

- `memory/init_db.py` - Database initialization script
- `memory/memory_manager.py` - Core persistence layer
- `view_incidents.py` - CLI tool to browse stored incidents
- `memory/agent_state.sqlite` - SQLite database file (created on first run)

## Testing

```bash
# Run demo with database persistence
uv run python dry_run_enhanced.py

# View results
python view_incidents.py
```

The demo will:
1. Detect patterns in events
2. Generate root cause hypothesis
3. Decide on actions
4. Execute actions with approval
5. **Store everything in database** ✅
6. Display database contents at the end
