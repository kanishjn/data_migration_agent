# Signals Disappearing Fix

## Problem
Signals were disappearing from the UI after page refresh because the frontend was fetching from `/api/signals/pending`, which only returns **unprocessed** events. Once the backend agent processed these events, they were marked as processed and no longer appeared in the response.

## Root Cause
- Frontend: `api.getEvents()` → calls `/api/signals/pending`
- Backend: `/api/signals/pending` → returns `event_store.get_unprocessed()`
- Agent: Automatically processes events during observe-reason-decide-act loop
- Result: Processed events disappear from the endpoint

## Solution
Added a new endpoint `/api/signals/all` that returns ALL recent events (both processed and unprocessed) using the existing `event_store.get_recent()` method.

### Changes Made

#### 1. Backend: Added `/api/signals/all` endpoint
**File**: `backend/api/routes/signals.py`

```python
@router.get("/all")
async def get_all_signals(
    limit: int = 100,
    hours: int | None = None,
    event_type: str | None = None
) -> dict[str, Any]:
    """
    Get all recent signals (both processed and unprocessed) from the event store.
    """
    event_store = get_event_store()
    events = event_store.get_recent(limit=limit, hours=hours, event_type=event_type)
    signal_logger.info(f"Retrieved {len(events)} signals (all)")
    return {
        "count": len(events),
        "total_pending": event_store.count_unprocessed(),
        "signals": events
    }
```

#### 2. Frontend: Updated API client
**File**: `frontend/lib/api.ts`

Changed `getEvents()` to call the new `/api/signals/all` endpoint:
```typescript
getEvents: (limit = 100) =>
  fetchApi<{ count: number; total_pending: number; signals: ApiEvent[] }>(`/api/signals/all?limit=${limit}`),

// Also added getPendingEvents() for future use
getPendingEvents: (limit = 100) =>
  fetchApi<{ count: number; total_pending: number; signals: ApiEvent[] }>(`/api/signals/pending?limit=${limit}`),
```

## Behavior After Fix

### Before
- User sees signals on initial load
- Backend agent processes events (marks as processed)
- User refreshes page
- **Signals disappear** (because they're now processed)

### After
- User sees signals on initial load
- Backend agent processes events (marks as processed)
- User refreshes page
- **Signals persist** (because `/api/signals/all` returns all events)
- UI can distinguish processed vs unprocessed using the event's `processed` flag

## Additional Features
The new `/all` endpoint supports optional filters:
- `limit`: Maximum number of events to return (default: 100)
- `hours`: Filter events from last N hours
- `event_type`: Filter by specific event type

Example:
```
GET /api/signals/all?limit=200&hours=24&event_type=api_error
```

## Testing
1. Start backend: `cd backend && python run_backend.py`
2. Ingest some test events via `/api/simulations/ingest`
3. Visit the signals page in the frontend
4. Let the agent process the events (or manually trigger processing)
5. Refresh the page
6. **Expected**: Signals should still be visible

## Notes
- The `/api/signals/pending` endpoint remains unchanged for other use cases that specifically need only unprocessed events
- The `ApiContext` auto-refresh (every 30s) will now maintain signal history
- Signals can be marked with a visual indicator in the UI to show processed vs pending state
