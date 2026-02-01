"""
Background job: Detect incidents from unprocessed events.

Runs periodically (every 5 min by default) to:
1. Fetch unprocessed events from event store
2. Run observer -> reasoner -> decider pipeline
3. Store incident and pending actions for human review
4. Mark events as processed
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from typing import Optional
from memory.event_store import get_event_store
from memory.memory_manager import MemoryManager
from orchestrator.agent_orchestrator import AgentOrchestrator
from api.routes.agent import update_agent_state, add_proposed_action
from utils.logger import api_logger

try:
    from config import get
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False


def run_detect_incidents(use_llm: bool = False, dry_run: bool = True) -> dict:
    """
    Run the incident detection pipeline on unprocessed events.

    Returns:
        Dict with status, events_processed, patterns_detected, actions_pending
    """
    if CONFIG_AVAILABLE:
        batch_size = get("scheduler.batch_size", 500)
        use_llm = get("reasoning.use_llm", use_llm)
    else:
        batch_size = 500

    event_store = get_event_store()
    events = event_store.get_unprocessed(limit=batch_size)

    if not events:
        api_logger.debug("No unprocessed events")
        return {
            "status": "idle",
            "events_processed": 0,
            "patterns_detected": 0,
            "actions_pending": 0,
        }

    api_logger.info(f"Processing {len(events)} unprocessed events")

    orchestrator = AgentOrchestrator(dry_run=dry_run, use_llm=use_llm)
    report = orchestrator.run_with_approval(events)

    observation = report.get("observation", {})
    reasoning = report.get("reasoning", {})
    decision = report.get("decision", {})

    patterns = observation.get("patterns", [])
    event_ids = [e.get("id") for e in events if e.get("id")]

    memory = MemoryManager()

    # Store incident if we have patterns
    incident_id = None
    if patterns:
        primary_hyp = reasoning.get("primary_hypothesis") or {}
        root_cause = primary_hyp.get("cause", "Unknown") if isinstance(primary_hyp, dict) else str(primary_hyp)
        confidence = primary_hyp.get("confidence", 0) if isinstance(primary_hyp, dict) else 0
        actions = decision.get("recommended_actions", [])
        signal_cluster = observation.get("summary", "Pattern detected")

        incident_id = memory.record_full_incident(
            signal_cluster=signal_cluster,
            root_cause=root_cause,
            confidence=confidence,
            actions_taken=[],
            observation=observation,
            reasoning=reasoning,
            event_ids=event_ids,
        )

        # Store pending actions in DB
        for i, action in enumerate(actions):
            action_type = action.get("type", "unknown")
            action_id = f"ACT-{incident_id}-{i:04d}"
            memory.add_pending_action(
                action_id=action_id,
                action_type=action_type,
                target=action.get("target", "general"),
                content=action.get("content", ""),
                risk=action.get("risk", "medium"),
                severity=action.get("severity"),
                reasoning=action.get("reason", ""),
                incident_id=incident_id,
                confidence=confidence,
                raw_payload=action,
            )
    # Update agent state
    detected_issues = []
    if patterns:
        for p in patterns:
            detected_issues.append({
                "issue_id": f"ISS-{hash(str(p)) % 100000:05d}",
                "description": p.get("error_code", p.get("pattern_type", "pattern")),
                "confidence": 0.7,
                "related_signals": [str(x) for x in event_ids[:5]],
            })

    pending = memory.get_pending_actions(status_filter="pending")
    proposed_for_state = [
        {
            "action_id": a.get("action_id"),
            "action_type": a.get("action_type", "unknown"),
            "description": (a.get("content") or a.get("reasoning", ""))[:200],
            "target": a.get("target", "general"),
            "confidence": a.get("confidence", 0),
            "status": a.get("status", "pending"),
            "reasoning": a.get("reasoning"),
        }
        for a in pending
    ]

    update_agent_state(
        detected_issues=detected_issues if detected_issues else None,
        proposed_actions=proposed_for_state if proposed_for_state else None,
        overall_confidence=reasoning.get("confidence", 0),
        agent_status="awaiting_approval",
    )

    # Mark events as processed
    event_store.mark_processed(event_ids)

    pending_count = len(memory.get_pending_actions(status_filter="pending"))

    api_logger.info(f"Incident detection complete: {len(patterns)} patterns, {pending_count} actions pending")

    return {
        "status": "completed",
        "events_processed": len(events),
        "patterns_detected": len(patterns),
        "actions_pending": pending_count,
        "incident_id": incident_id,
    }
