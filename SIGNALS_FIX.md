# Signals Disappearing Fix

## Problem
Signals appeared to "disappear" on page refresh, showing an empty state briefly before data loaded.

## Root Cause Analysis

### Initial Hypothesis (Incorrect)
Initially suspected that the frontend was fetching from `/api/signals/pending`, which only returns **unprocessed** events. Once the backend agent processed these events, they would be marked as processed and no longer appear in the response.

### Actual Root Cause (Correct)
The real issue was a **React rendering race condition**:

When refreshing the page:
1. **First render**: `useApi: false, events.length: 0` → Shows empty state
2. **Second render**: `useApi: true, events.length: 0` → Still empty (API enabled but data not fetched yet)
3. **Third render**: API fetch completes → `events.length: 100`
4. **Fourth render**: Signals display correctly ✅

The page was showing the empty state **before** the API data finished loading, creating the perception that signals "disappeared" on refresh.

## Solution Implemented

### 1. Added `/api/signals/all` Endpoint (Backend)
Created a new endpoint that returns ALL recent events (both processed and unprocessed) to ensure signal persistence.

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

### 2. Updated Frontend API Client
**File**: `frontend/lib/api.ts`

Changed `getEvents()` to call the new `/api/signals/all` endpoint:
```typescript
getEvents: (limit = 100) =>
  fetchApi<{ count: number; total_pending: number; signals: ApiEvent[] }>(`/api/signals/all?limit=${limit}`),

// Also added getPendingEvents() for future use
getPendingEvents: (limit = 100) =>
  fetchApi<{ count: number; total_pending: number; signals: ApiEvent[] }>(`/api/signals/pending?limit=${limit}`),
```

### 3. Added Loading State (Frontend)
**File**: `frontend/app/signals/page.tsx`

Added a proper loading state to prevent showing empty state while data is being fetched:

```tsx
{/* Loading State */}
{loading && filteredSignals.length === 0 && (
  <div className="text-center py-12">
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-cyan-500 rounded-full mx-auto mb-4"
    />
    <p className="text-zinc-500">Loading signals...</p>
  </div>
)}

{/* Empty State */}
{!loading && filteredSignals.length === 0 && (
  <div className="text-center py-12">
    <AlertTriangle className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-4" />
    <p className="text-zinc-500">No signals match your filters</p>
  </div>
)}
```

## Behavior After Fix

### Before
- User refreshes page
- **Sees empty state** (signals appear to "vanish")
- After ~500ms, signals suddenly appear
- Poor UX - feels broken

### After
- User refreshes page
- **Sees loading spinner** with "Loading signals..." message
- Signals appear smoothly once data loads
- Clear visual feedback that data is loading
- Professional UX

## Additional Features
The new `/all` endpoint supports optional filters:
- `limit`: Maximum number of events to return (default: 100)
- `hours`: Filter events from last N hours
- `event_type`: Filter by specific event type

Example:
```
GET /api/signals/all?limit=200&hours=24&event_type=api_error
```

## Technical Details

### Why the Race Condition Occurred
React's `useApiContext()` hook:
1. Initializes with `useApi: false` and `events: []`
2. Triggers async fetch on mount
3. Component renders **before** fetch completes
4. Shows empty state to user
5. Fetch completes, state updates, re-renders with data

### Why Loading State Fixes It
By checking the `loading` flag from ApiContext:
- Shows spinner when `loading === true && events.length === 0`
- Shows empty state only when `loading === false && events.length === 0`
- Prevents premature empty state display

## Testing
1. Start backend: `cd backend && python run_backend.py`
2. Ingest test events via `/api/simulations/ingest`
3. Visit the signals page in the frontend
4. Refresh the page (Cmd+R or F5)
5. **Expected**: 
   - Brief loading spinner appears
   - Signals load and display
   - No empty "vanishing" state

## Notes
- The `/api/signals/pending` endpoint remains unchanged for other use cases
- The `ApiContext` auto-refresh (every 30s) now maintains signal history
- Loading state provides professional UX during data fetch
- Debug logging was added during diagnosis and removed after fix
