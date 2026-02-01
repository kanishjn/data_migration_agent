# Sidebar Navigation Update

## Changes Made

### Before:
```
📊 Dashboard
🔀 Migration          ← Old migration page
📡 Signals
👁️  Patterns
🧠 Reasoning
⚖️  Decisions
🛡️  Actions
📖 Docs
```

### After:
```
📊 Dashboard
📡 Signals
👁️  Patterns
🧠 Reasoning
⚖️  Decisions
🛡️  Actions
📖 Docs
💻 Agent Logs         ← NEW: Live log streaming
📈 Migration Sim      ← NEW: Live migration visualization
```

## What Changed

### Removed
- ❌ **Migration** (`/migration`) - Old static migration page with pipeline visualization

### Added
- ✅ **Agent Logs** (`/logs`) - Real-time log streaming with SSE
  - Icon: Terminal 💻
  - Description: "Live system logs"
  - Features: Stream, pause, download, color-coded logs
  
- ✅ **Migration Sim** (`/migration-sim`) - Live migration simulation
  - Icon: Activity 📈
  - Description: "Live simulation"
  - Features: Real-time merchant status, health scores, progress tracking

## Navigation Order

The new order maintains the agent loop flow while adding monitoring tools at the end:

1. **Dashboard** - Overview and summary
2. **Signals** - OBSERVE layer (raw events)
3. **Patterns** - Pattern detection
4. **Reasoning** - AI hypotheses
5. **Decisions** - Decision engine
6. **Actions** - Action execution
7. **Docs** - Documentation
8. **Agent Logs** - System monitoring ⭐ NEW
9. **Migration Sim** - Live demo ⭐ NEW

## Icons Used

- **Agent Logs**: `Terminal` icon (lucide-react)
- **Migration Sim**: `Activity` icon (lucide-react)

Both icons fit the technical monitoring theme and are visually distinct from other nav items.

## Access

- Agent Logs: http://localhost:3000/logs
- Migration Sim: http://localhost:3000/migration-sim

Both pages are now accessible from the sidebar navigation! 🎉
