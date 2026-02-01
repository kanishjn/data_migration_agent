# 🚀 Quick Start - Migration Agent Demo

## One Command Demo

```bash
cd backend && python run_full_demo.py
```

That's it! This will:
- ✅ Load all JSON simulation data (25 events)
- ✅ Run the agent orchestrator
- ✅ Generate patterns, incidents, reasoning, actions
- ✅ Everything appears in frontend instantly

## What You'll See

### Frontend (http://localhost:3000)
- **Dashboard** - Real stats and active incidents
- **Signals** - All 25+ events from JSON files
- **Patterns** - AI-detected clusters
- **Reasoning** - LLM analysis and hypotheses
- **Actions** - Pending approvals (approve some!)
- **Logs** - Live streaming agent activity
- **Migration Sim** - Real merchant status from JSON

### Expected Output
```
🚀 MIGRATION AGENT FULL SYSTEM DEMO
📥 Loading 25 events from JSON files...
✅ Saved to database
🤖 Running agent loop...
✅ Created patterns, incidents, actions
📊 Ready to view in frontend!
```

## Files Used

### Input (JSON Simulations)
- `backend/simulations/api_errors_enhanced.json` (8 errors)
- `backend/simulations/tickets.json` (6 tickets)
- `backend/simulations/webhook_failures.json` (5 failures)
- `backend/simulations/migration_states.json` (6 merchants)

### Output (Database)
- `backend/memory/agent_state.sqlite`
  - events table (670+ rows)
  - incidents table
  - actions table

## Quick Checks

```bash
# Verify data loaded
sqlite3 backend/memory/agent_state.sqlite "SELECT COUNT(*) FROM events;"

# Check API
curl http://localhost:8000/api/signals/all?limit=5

# Check migration data
curl http://localhost:8000/api/migration/status

# Stream logs
curl -N http://localhost:8000/api/logs/stream
```

## Troubleshooting

### "No events showing"
```bash
cd backend
python load_demo_data.py
```

### "Agent not running"
```bash
curl -X POST http://localhost:8000/api/agent/run
```

### "Frontend not updating"
- Check console for errors
- Verify backend is running on port 8000
- Refresh the page

## Alternative: Step by Step

```bash
# 1. Start backend
cd backend
uvicorn api.main:app --reload --port 8000

# 2. Start frontend (new terminal)
cd frontend
npm run dev

# 3. Load demo data (new terminal)
cd backend
python run_full_demo.py

# 4. Open browser
open http://localhost:3000
```

## For Presentations

**5-Minute Demo:**
1. Run: `python run_full_demo.py` (30s)
2. Show Dashboard with stats (30s)
3. Show Signals with raw events (1min)
4. Show Reasoning with AI analysis (2min)
5. Show Logs streaming live (1min)

**10-Minute Demo:**
Add:
6. Show Patterns page (1min)
7. Show Actions and approve one (2min)
8. Show Migration Sim (1min)
9. Show Incidents (1min)

## Key URLs

- Dashboard: http://localhost:3000
- Signals: http://localhost:3000/signals
- Patterns: http://localhost:3000/patterns
- Reasoning: http://localhost:3000/reasoning
- Actions: http://localhost:3000/actions
- Logs: http://localhost:3000/logs
- Migration: http://localhost:3000/migration-sim
- API Docs: http://localhost:8000/docs

## Pro Tips

💡 Run demo before presenting to populate data
💡 Keep logs page open to show live activity
💡 Approve some actions to demo the workflow
💡 Use migration sim to show visual status
💡 Refresh data anytime with: `python run_full_demo.py`

---

**You're ready! Run the demo and impress! 🎉**
