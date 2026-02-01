# Live Features Implementation

## Overview
Added two powerful live features to enhance system observability and migration visualization.

## 1. Live Logs Streaming 🔴

### Backend (`/api/logs`)
**File**: `backend/api/routes/logs.py`

New endpoints:
- **GET `/api/logs/stream`** - Server-Sent Events (SSE) for real-time log streaming
  - Streams `agent.log` file continuously
  - Auto-scrolls as new logs arrive
  - Parameters: `lines` (default: 100) - initial lines to show
  
- **GET `/api/logs/recent`** - Get recent logs (non-streaming)
  - Returns last N lines as JSON
  - Useful for quick log checks

### Frontend (`/logs`)
**File**: `frontend/app/logs/page.tsx`

Features:
- **Real-time streaming** using EventSource API
- **Start/Stop** controls for streaming
- **Pause/Resume** without losing data (buffers logs while paused)
- **Clear logs** button
- **Download logs** as .log file
- **Color-coded** log levels:
  - 🔴 ERROR/CRITICAL - red
  - 🟡 WARNING - amber
  - 🔵 INFO - cyan
  - ⚫ DEBUG - gray
- **Line counter** shows total lines and buffered count
- **Live indicator** when streaming
- **Terminal UI** with macOS-style window controls

### Usage
1. Navigate to `/logs` in the frontend
2. Logs automatically start streaming on page load
3. Use controls to pause, clear, or download logs
4. Logs auto-scroll to bottom (stops when paused)

### Access
```bash
# Frontend
http://localhost:3000/logs

# Backend API
http://localhost:8000/api/logs/stream
http://localhost:8000/api/logs/recent?lines=100
```

---

## 2. Migration Simulation Visualization 🎯

### Backend (`/api/migration`)
**File**: `backend/api/routes/migration.py`

New endpoints:
- **GET `/api/migration/status`** - Get current migration status for all merchants
  - Returns 6 merchants with randomized states
  - Stages: pre_migration, in_progress, post_migration, completed
  - Includes progress %, health score, current issues
  - Summary stats: total, completed, in progress, average health

- **POST `/api/migration/simulate-event`** - Trigger specific events
  - Event types: start, issue, resolve, complete
  - Simulates state changes for specific merchants

- **POST `/api/migration/generate-traffic`** - Generate random events
  - Creates N random migration events
  - Event types: api_error, webhook_failure, migration_update, health_check

### Frontend (`/migration-sim`)
**File**: `frontend/app/migration-sim/page.tsx`

Features:
- **Live simulation** with auto-refresh every 3 seconds
- **Start/Stop/Reset** controls
- **Summary dashboard** showing:
  - Total merchants
  - In progress count
  - Completed count
  - Average health score
- **Merchant cards** with:
  - Real-time progress bars
  - Health score indicators
  - Current stage badges (animated pulse for in-progress)
  - Active issues display
  - Order volume info
- **Smooth animations** on data updates
- **Color-coded stages**:
  - ⚪ Pre-migration (gray)
  - 🟡 In Progress (amber, pulsing)
  - 🔵 Post-migration (cyan)
  - 🟢 Completed (emerald)
- **Health score colors**:
  - 🟢 80%+ (healthy)
  - 🟡 60-79% (warning)
  - 🔴 <60% (critical)

### Usage
1. Navigate to `/migration-sim` in the frontend
2. Click "Start Simulation" to begin auto-updates
3. Watch merchant cards update with new statuses
4. Observe progress bars, health scores, and issues in real-time
5. Click "Reset" to fetch fresh data

### Access
```bash
# Frontend
http://localhost:3000/migration-sim

# Backend API
http://localhost:8000/api/migration/status
http://localhost:8000/api/migration/simulate-event
http://localhost:8000/api/migration/generate-traffic?count=10
```

---

## Integration with Existing System

### Logs Integration
- Logs stream from the existing `backend/logs/agent.log` file
- All agent activity (observe, reason, decide, act) appears in real-time
- Integrates with existing logging infrastructure
- No changes needed to existing code

### Migration Integration
- Simulation endpoints can be replaced with real migration data
- Compatible with existing merchant/migration data structures
- Can be enhanced to ingest real events into the agent pipeline
- UI components can be reused for real migration dashboard

---

## Technical Details

### Server-Sent Events (SSE)
The logs streaming uses SSE instead of WebSockets because:
- Simpler server-side implementation
- Automatic reconnection on disconnect
- Better for one-way data flow (server → client)
- Lower overhead than WebSockets

### Polling vs Streaming
- Logs: SSE streaming (real-time, low latency)
- Migration: Polling every 3 seconds (sufficient for dashboard updates)
- Both approaches are lightweight and performant

### Data Flow
```
Logs Stream:
agent.log → /api/logs/stream → EventSource → React state → UI

Migration Simulation:
Random data → /api/migration/status → fetch (polling) → React state → UI
```

---

## Future Enhancements

### Logs
- [ ] Add log level filtering (show only errors, warnings, etc.)
- [ ] Search/filter logs by keyword
- [ ] Export logs with custom date range
- [ ] Add log rotation support
- [ ] WebSocket option for better performance

### Migration
- [ ] Connect to real migration data from database
- [ ] Add manual event triggers (simulate specific issues)
- [ ] Historical timeline view
- [ ] Integration with agent reasoning (show AI decisions)
- [ ] Merchant detail drill-down
- [ ] Export migration reports

---

## Testing

### Test Logs
```bash
# Check recent logs
curl http://localhost:8000/api/logs/recent?lines=10

# Stream logs (in terminal)
curl -N http://localhost:8000/api/logs/stream
```

### Test Migration
```bash
# Get current status
curl http://localhost:8000/api/migration/status | jq .

# Generate traffic
curl -X POST http://localhost:8000/api/migration/generate-traffic?count=20

# Simulate event
curl -X POST 'http://localhost:8000/api/migration/simulate-event?merchant_id=m_fashion_co&event_type=issue'
```

---

## Files Changed

### Backend
- ✅ `backend/api/routes/logs.py` (new)
- ✅ `backend/api/routes/migration.py` (new)
- ✅ `backend/api/routes/__init__.py` (updated imports)
- ✅ `backend/api/main.py` (added routers)

### Frontend
- ✅ `frontend/app/logs/page.tsx` (new)
- ✅ `frontend/app/migration-sim/page.tsx` (new)
- ✅ `frontend/app/page.tsx` (removed debug logs)

---

## Demo Screenshots

Visit these pages to see the features in action:
- 📊 **Logs**: http://localhost:3000/logs
- 🔄 **Migration Sim**: http://localhost:3000/migration-sim

Both pages are ready to use immediately!
