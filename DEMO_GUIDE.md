# 🚀 Complete System Demo Guide

This guide shows you how to run a full demonstration of the Migration Agent system with all features activated.

## Overview

The demo system loads real data from JSON files, runs the agent loop, and populates the database so **everything shows up in the frontend**.

## Data Sources

All demo data comes from `/backend/simulations/`:
- `api_errors_enhanced.json` - API errors from various merchants
- `tickets.json` - Support tickets with issues
- `webhook_failures.json` - Webhook delivery failures
- `migration_states.json` - Current merchant migration status

## Quick Start

### Option 1: Full Automated Demo (Recommended)

Loads all data + runs agent loop + generates incidents/patterns/actions:

```bash
cd backend
python run_full_demo.py
```

**What it does:**
1. ✅ Loads all JSON simulation files
2. ✅ Converts to normalized events
3. ✅ Saves to EventStore database
4. ✅ Runs agent orchestrator (OBSERVE → REASON → DECIDE → ACT)
5. ✅ Generates incidents, patterns, reasoning, and actions
6. ✅ Everything shows up in frontend!

**Expected Output:**
```
🚀 MIGRATION AGENT FULL SYSTEM DEMO
================================================================================
📥 PHASE 1: Loading Simulation Data
--------------------------------------------------------------------------------
✓ Loaded 10 records from api_errors_enhanced.json
✓ Loaded 6 records from tickets.json
✓ Loaded 5 records from webhook_failures.json
✓ Loaded 6 records from migration_states.json
✓ Normalized 27 total events
✓ Saved 27 events to EventStore

🤖 PHASE 2: Running Agent Loop
--------------------------------------------------------------------------------
🔍 OBSERVE: Detecting patterns from signals...
🧠 REASON: Analyzing root causes with LLM...
⚖️  DECIDE: Evaluating potential actions...
⚡ ACT: Generating action proposals...

✅ Agent loop completed successfully!
   • Observations: 27
   • Patterns detected: 5
   • Incidents created: 3
   • Actions proposed: 8

📊 PHASE 3: System State
--------------------------------------------------------------------------------
✓ Dashboard - System overview with stats
✓ Signals - All ingested events visible
✓ Patterns - Detected patterns from clustering
✓ Reasoning - LLM-generated hypotheses
✓ Actions - Pending approvals
✓ Incidents - Created from patterns
```

---

### Option 2: Data Loading Only

Just load data without running the agent loop:

```bash
cd backend
python load_demo_data.py
```

**What it does:**
- ✅ Loads all JSON files
- ✅ Saves to database
- ❌ Does NOT run agent loop (you run it manually)

**Then manually trigger the agent:**
```bash
# Via API
curl -X POST http://localhost:8000/api/agent/run

# Or via frontend
Go to http://localhost:3000 and click "Run Agent Loop"
```

---

### Option 3: API Endpoint (For Presentations)

Load data via REST API:

```bash
# Load all simulation data
curl -X POST http://localhost:8000/api/simulations/ingest

# Run agent loop
curl -X POST http://localhost:8000/api/agent/run
```

---

## What Gets Created

After running the demo, you'll see:

### 📡 Signals Page (`/signals`)
- 27+ events from JSON files
- API errors, tickets, webhooks, migration updates
- All searchable and filterable

### 👁️ Patterns Page (`/patterns`)
- Clustered events by similarity
- Pattern summaries
- Affected merchants count

### 🧠 Reasoning Page (`/reasoning`)
- LLM-generated hypotheses
- Root cause analysis
- Confidence scores
- Evidence from signals

### ⚖️ Decisions Page (`/decisions`)
- Risk-assessed actions
- Impact analysis
- Approval requirements

### ⚡ Actions Page (`/actions`)
- Pending approvals
- Action history
- Execution status

### 🚨 Incidents
- Created from high-confidence patterns
- Linked to signals and actions
- Status tracking

### 📈 Dashboard
- Active incidents count
- System health metrics
- Recent patterns
- Agent loop status

### 📈 Migration Sim (`/migration-sim`)
- Live merchant migration status from `migration_states.json`
- Real health scores
- Actual progress data

---

## Step-by-Step Walkthrough

### 1. Clean Start (Optional)

If you want to start fresh:

```bash
cd backend
rm memory/agent_state.sqlite
python -c "from memory.init_db import init_db; init_db()"
```

### 2. Start Backend

```bash
cd backend
uvicorn api.main:app --reload --port 8000
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

### 4. Load Demo Data

```bash
cd backend
python run_full_demo.py
```

### 5. Explore the Frontend

Visit these pages to see the results:

1. **Dashboard** - http://localhost:3000
   - See active incidents count
   - System health overview

2. **Signals** - http://localhost:3000/signals
   - All 27+ loaded events
   - Filter by source, severity

3. **Patterns** - http://localhost:3000/patterns
   - Detected patterns from clustering
   - Click to see details

4. **Reasoning** - http://localhost:3000/reasoning
   - LLM analysis and hypotheses
   - See the AI thinking!

5. **Actions** - http://localhost:3000/actions
   - Pending approvals
   - Approve or reject actions

6. **Logs** - http://localhost:3000/logs
   - Live streaming logs
   - See agent activity in real-time

7. **Migration Sim** - http://localhost:3000/migration-sim
   - Live merchant status
   - Real data from JSON files

---

## Customization

### Add More Data

Edit the JSON files in `/backend/simulations/`:

```bash
# Add more merchants
vi backend/simulations/migration_states.json

# Add more errors
vi backend/simulations/api_errors_enhanced.json

# Then reload
python run_full_demo.py
```

### Adjust Agent Behavior

Edit configuration files:

```bash
vi backend/config/thresholds.yaml    # Pattern detection thresholds
vi backend/config/risk_matrix.yaml   # Risk scoring
vi backend/config/agent_policies.yaml # Action policies
```

---

## Troubleshooting

### "No events found"
```bash
# Check database
cd backend
sqlite3 memory/agent_state.sqlite "SELECT COUNT(*) FROM events;"

# Reload data
python load_demo_data.py
```

### "Agent loop not running"
```bash
# Check logs
tail -f backend/logs/agent.log

# Manually trigger
curl -X POST http://localhost:8000/api/agent/run
```

### "Frontend not showing data"
```bash
# Check API connection
curl http://localhost:8000/api/signals/all?limit=10

# Check browser console for errors
# Make sure NEXT_PUBLIC_API_URL is set
```

---

## Advanced: Continuous Demo Mode

For presentations, run the demo in a loop:

```bash
cd backend

# Clear and reload every 5 minutes
while true; do
    python run_full_demo.py
    sleep 300
done
```

---

## What Makes This Demo Complete?

✅ **Real Data**: Uses actual JSON simulation files
✅ **Full Pipeline**: OBSERVE → REASON → DECIDE → ACT
✅ **Database Persistence**: All data saved to SQLite
✅ **Frontend Integration**: Everything visible in UI
✅ **Live Updates**: ApiContext fetches from backend
✅ **Agent Intelligence**: LLM reasoning included
✅ **Human-in-Loop**: Approval workflow works
✅ **Monitoring**: Live logs streaming

---

## Pro Tips

1. **Run demo first**: Always run `run_full_demo.py` before presenting
2. **Check logs page**: Shows real-time agent activity
3. **Use migration sim**: Visual representation of merchant status
4. **Approve actions**: Go to Actions page and approve some actions to see execution
5. **Refresh data**: Re-run demo anytime to get fresh randomized patterns

---

## Demo Script for Presentations

1. **Introduction** (1 min)
   - "Let me show you a full AI agent system for migration support"

2. **Load Data** (30 sec)
   ```bash
   python run_full_demo.py
   ```

3. **Show Dashboard** (1 min)
   - Active incidents
   - System health
   - "All this data came from JSON files"

4. **Show Signals** (1 min)
   - "Raw events from merchants"
   - Filter by type
   - Click to expand

5. **Show Patterns** (1 min)
   - "Agent clustered similar events"
   - Pattern details
   - Affected merchants

6. **Show Reasoning** (2 min)
   - "This is the AI thinking"
   - LLM-generated hypotheses
   - Confidence scores
   - Evidence

7. **Show Actions** (2 min)
   - Pending approvals
   - Approve an action
   - Show execution

8. **Show Logs** (1 min)
   - Live streaming
   - Real-time activity
   - Color-coded by severity

9. **Show Migration Sim** (1 min)
   - Live merchant status
   - Progress tracking
   - Real data from JSON

**Total: ~10 minutes for complete walkthrough**

---

## Need Help?

Check the logs:
```bash
tail -f backend/logs/agent.log
```

Or run with debug output:
```bash
python run_full_demo.py --verbose
```

---

**You're all set! Run `python run_full_demo.py` and watch the magic happen! ✨**
