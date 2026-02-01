#!/usr/bin/env python3
"""
FULL DEMO: One script to run the entire Migration Agent workflow.

Loads simulation data from JSON → Event Store → Observe → Reason → Decide → Act
All results persist to DB and appear in the frontend.

Usage:
    python run_full_demo.py              # Heuristics only (fast, ~1s)
    python run_full_demo.py --use-llm    # Use Gemini for reasoning (slower, 5-15s, needs GEMINI_API_KEY)

Why so fast without --use-llm?
    The pipeline runs Observe → Reason → Decide → Act. Without LLM, Reason and Decide use
    rule-based heuristics (instant). With --use-llm, they call Gemini API (adds latency).

Prerequisites:
    - Backend API running (for frontend to fetch): uvicorn api.main:app --port 8000
    - Frontend: npm run dev (optional, to view results)
"""

import argparse
import json
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from memory.event_store import get_event_store
from memory.memory_manager import MemoryManager
from orchestrator.agent_orchestrator import AgentOrchestrator
from jobs.detect_incidents import run_detect_incidents
from utils.logger import api_logger


def reset_events_table(event_store) -> int:
    """Clear all events to start fresh. Returns number of deleted rows."""
    conn = sqlite3.connect(event_store.db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM events")
    count = cursor.fetchone()[0]
    cursor.execute("DELETE FROM events")
    conn.commit()
    conn.close()
    return count


def reset_processed_flag(event_store) -> int:
    """Mark all events as unprocessed so they can be reanalyzed."""
    conn = sqlite3.connect(event_store.db_path)
    cursor = conn.cursor()
    cursor.execute("UPDATE events SET processed = 0")
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    return updated


def count_unprocessed(event_store) -> int:
    """Count unprocessed events."""
    conn = sqlite3.connect(event_store.db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM events WHERE processed = 0")
    count = cursor.fetchone()[0]
    conn.close()
    return count


def load_and_ingest_all(simulations_dir: Path, event_store) -> int:
    """Load all JSON files, normalize, and save to event store. Returns event count."""
    all_raw = []

    files = [
        "api_errors.json",
        "api_errors_enhanced.json",
        "tickets.json",
        "webhook_failures.json",
        "migration_states.json",
    ]

    for filename in files:
        path = simulations_dir / filename
        if not path.exists():
            continue
        try:
            with open(path) as f:
                data = json.load(f)
            if isinstance(data, list):
                all_raw.extend(data)
            else:
                all_raw.append(data)
            api_logger.info(f"  Loaded {len(data) if isinstance(data, list) else 1} from {filename}")
        except Exception as e:
            api_logger.warning(f"  Skip {filename}: {e}")

    if not all_raw:
        return 0

    ids = event_store.save_batch(all_raw)
    return len(ids)


def main():
    parser = argparse.ArgumentParser(description="Run full Migration Agent demo")
    parser.add_argument("--use-llm", action="store_true", help="Use Gemini LLM for reasoning (slower, needs GEMINI_API_KEY)")
    parser.add_argument("--fresh", action="store_true", help="Clear existing events before loading new ones")
    parser.add_argument("--execute", action="store_true", help="Actually execute actions (sends real emails if configured)")
    args = parser.parse_args()

    sim_dir = Path(__file__).parent / "simulations"
    event_store = get_event_store()

    print("\n" + "=" * 70)
    print("  MIGRATION AGENT - FULL DEMO")
    print("  Observe → Reason → Decide → Act")
    if args.use_llm:
        print("  Mode: LLM (Gemini) - expect 5-15s for reasoning")
    else:
        print("  Mode: Heuristics (fast) - use --use-llm for AI reasoning")
    if args.execute:
        print("  Actions: EXECUTE (will send real emails/notifications)")
    else:
        print("  Actions: DRY RUN (use --execute to send real notifications)")
    print("=" * 70)

    # Phase 0: Reset if --fresh flag
    if args.fresh:
        print("\n🗑️  PHASE 0: Clearing existing events...")
        deleted = reset_events_table(event_store)
        print(f"  ✓ Deleted {deleted} existing events")

    # Phase 1: Load JSON and ingest
    print("\n📥 PHASE 1: Loading simulation data from JSON...")
    
    # First, reset processed status to ensure events can be reprocessed
    reset_processed_flag(event_store)
    
    start = time.time()
    count = load_and_ingest_all(sim_dir, event_store)
    
    # Count total unprocessed
    unprocessed = count_unprocessed(event_store)
    
    print(f"  ✓ Loaded {count} new events in {time.time() - start:.1f}s")
    print(f"  ✓ Total unprocessed events: {unprocessed}")

    if unprocessed == 0:
        print("  ⚠ No unprocessed events. Try running with --fresh flag.")
        sys.exit(1)

    # Phase 2: Run full agent pipeline directly
    print("\n🤖 PHASE 2: Running agent pipeline...")
    print("  → Observe: Detecting patterns in signals...")
    
    start = time.time()
    
    # Get unprocessed events
    events = event_store.get_unprocessed(limit=500)
    print(f"  → Found {len(events)} events to analyze")
    
    # Create orchestrator and run full pipeline
    # dry_run=False when --execute is set, so actions are really executed
    dry_run = not args.execute
    orchestrator = AgentOrchestrator(dry_run=dry_run, use_llm=args.use_llm)
    
    print("  → Reason:  Generating root cause hypotheses...")
    print("  → Decide:  Choosing recommended actions...")
    
    if args.execute:
        print("  → Act:     EXECUTING actions (sending emails, etc.)...")
        # Use run() with auto_approve=True to actually execute actions
        report = orchestrator.run(events, auto_approve=True)
    else:
        print("  → Act:     Storing decisions for approval (dry run)...")
        report = orchestrator.run_with_approval(events)
    
    elapsed = time.time() - start
    
    # Extract results
    observation = report.get("observation", {})
    reasoning = report.get("reasoning", {})
    decision = report.get("decision", {})
    execution = report.get("execution", {})
    
    patterns = observation.get("patterns", [])
    primary_hyp = reasoning.get("primary_hypothesis", {})
    actions = decision.get("recommended_actions", [])
    
    print(f"\n  ✓ Pipeline completed in {elapsed:.1f}s")
    
    # Store results in memory
    memory = MemoryManager()
    
    incident_id = None
    if patterns:
        root_cause = primary_hyp.get("cause", "Unknown") if isinstance(primary_hyp, dict) else str(primary_hyp)
        confidence = primary_hyp.get("confidence", 0) if isinstance(primary_hyp, dict) else 0
        
        incident_id = memory.record_incident(
            signal_cluster=observation.get("summary", "Pattern detected"),
            root_cause=root_cause,
            confidence=confidence,
            actions_taken=[],
            outcome=None,
            observation=observation,  # Store full observation with patterns
            reasoning=reasoning,       # Store full reasoning with hypotheses
        )
        
        # Store pending actions
        for i, action in enumerate(actions):
            action_id = f"ACT-{incident_id}-{i:04d}"
            memory.create_pending_action(
                action_id=action_id,
                action_type=action.get("type", "unknown"),
                target=action.get("target", "general"),
                content=action.get("content", ""),
                confidence=confidence,
                raw_payload=action,
                incident_id=incident_id,
                risk=action.get("risk", "medium"),
                severity=action.get("severity"),
                reasoning=action.get("reason", ""),
            )
    
    # Mark events as processed
    event_ids = [e.get("id") for e in events if e.get("id")]
    if event_ids:
        event_store.mark_processed(event_ids)

    # Phase 3: Summary
    print("\n📊 PHASE 3: Results")
    print("-" * 70)
    print(f"  Events processed:    {len(events)}")
    print(f"  Patterns detected:   {len(patterns)}")
    print(f"  Actions generated:   {len(actions)}")
    print(f"  Incident ID:         {incident_id or 'N/A'}")
    
    if primary_hyp:
        print(f"\n  🔍 Root Cause Analysis:")
        if isinstance(primary_hyp, dict):
            print(f"     Cause:      {primary_hyp.get('cause', 'Unknown')}")
            print(f"     Confidence: {primary_hyp.get('confidence', 0):.0%}")
            print(f"     Method:     {reasoning.get('analysis_method', 'unknown')}")
        else:
            print(f"     {primary_hyp}")
    
    if actions:
        print(f"\n  📋 Recommended Actions:")
        for i, action in enumerate(actions[:5], 1):
            action_type = action.get("type", "unknown")
            target = action.get("target", "")
            print(f"     {i}. [{action_type}] {target}")
    
    pending_count = len(memory.get_pending_actions(status_filter="pending"))
    incidents = memory.get_recent_incidents(limit=5)
    
    print(f"\n  📈 Database State:")
    print(f"     Pending actions:  {pending_count}")
    print(f"     Recent incidents: {len(incidents)}")

    print("\n" + "=" * 70)
    print("  ✅ DEMO COMPLETE")
    print("=" * 70)
    print("\n  View in frontend: http://localhost:3000")
    print("  API must be running: uvicorn api.main:app --port 8000")
    print("\n" + "=" * 70 + "\n")


if __name__ == "__main__":
    main()
