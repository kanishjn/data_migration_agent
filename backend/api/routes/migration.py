"""
Migration simulation endpoints for visual demonstrations
"""
from fastapi import APIRouter
from typing import Any, Literal
import random
from datetime import datetime, timedelta
from pathlib import Path
import json

router = APIRouter()

# Load merchant data from simulation file
SIMULATIONS_DIR = Path(__file__).parent.parent.parent / "simulations"
MIGRATION_FILE = SIMULATIONS_DIR / "migration_states.json"

def load_merchants():
    """Load merchant data from migration_states.json"""
    try:
        with open(MIGRATION_FILE, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading migration states: {e}")
        return []

# Cache merchants data
_MERCHANTS_CACHE = None

def get_merchants():
    """Get merchants with caching"""
    global _MERCHANTS_CACHE
    if _MERCHANTS_CACHE is None:
        _MERCHANTS_CACHE = load_merchants()
    return _MERCHANTS_CACHE


ISSUES = [
    "Webhook timeout on order.created",
    "API rate limit exceeded",
    "Product sync taking longer than expected",
    "Customer login issues reported",
    "Payment gateway integration needs testing",
    "Image CDN migration pending",
    "SSL certificate renewal required",
    "Database migration in progress",
    None,  # No issues
    None,
]


@router.get("/status")
async def get_migration_status(refresh: bool = False) -> dict[str, Any]:
    """
    Get current migration status for all merchants from migration_states.json
    
    Args:
        refresh: Force reload from JSON file (default: False)
    """
    global _MERCHANTS_CACHE
    if refresh:
        _MERCHANTS_CACHE = None
    
    merchants = get_merchants()
    merchants_status = []
    
    for merchant in merchants:
        # Map stages from JSON to frontend format
        stage_mapping = {
            "pre_migration": "pre_migration",
            "in_progress": "in_progress",
            "post_migration": "post_migration",
            "fully_migrated": "completed",
        }
        
        current_stage = stage_mapping.get(merchant.get("current_stage", "pre_migration"), "pre_migration")
        
        # Calculate progress based on stage and health
        if current_stage == "pre_migration":
            progress = random.randint(5, 25)
        elif current_stage == "in_progress":
            progress = random.randint(30, 70)
        elif current_stage == "post_migration":
            progress = random.randint(75, 95)
        else:  # completed
            progress = 100
        
        # Use health score from JSON or generate random
        health_score = merchant.get("health_score", random.uniform(0.6, 1.0))
        
        # Use notes as current issue or pick random
        issue = merchant.get("notes") if merchant.get("open_issues_count", 0) > 0 else random.choice([None, None])
        
        merchants_status.append({
            "merchant_id": merchant["merchant_id"],
            "merchant_name": merchant["merchant_name"],
            "monthly_orders": merchant.get("monthly_order_volume", 5000),
            "current_stage": current_stage,
            "progress": progress,
            "health_score": round(health_score, 2),
            "current_issue": issue,
            "migration_started_at": merchant.get("migration_started_at"),
            "estimated_completion": merchant.get("migration_completed_at") or (datetime.now() + timedelta(days=random.randint(3, 30))).isoformat() if current_stage != "completed" else None,
        })
    
    # Overall stats
    total = len(merchants_status)
    completed = sum(1 for m in merchants_status if m["current_stage"] == "completed")
    in_progress = sum(1 for m in merchants_status if m["current_stage"] == "in_progress")
    avg_health = sum(m["health_score"] for m in merchants_status) / total if total > 0 else 0
    
    return {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_merchants": total,
            "completed": completed,
            "in_progress": in_progress,
            "pending": total - completed - in_progress,
            "average_health_score": round(avg_health, 2),
            "overall_progress": round((completed / total) * 100, 1) if total > 0 else 0,
        },
        "merchants": merchants_status,
    }


@router.post("/simulate-event")
async def simulate_migration_event(
    merchant_id: str,
    event_type: Literal["start", "issue", "resolve", "complete"],
) -> dict[str, Any]:
    """
    Simulate a migration event for a specific merchant
    
    Args:
        merchant_id: Merchant identifier
        event_type: Type of event to simulate
    """
    events = {
        "start": {
            "message": f"Migration started for {merchant_id}",
            "stage": "in_progress",
            "impact": "Migration process initiated",
        },
        "issue": {
            "message": f"Issue detected for {merchant_id}",
            "stage": "in_progress",
            "impact": random.choice(ISSUES[:-2]),  # Exclude None values
        },
        "resolve": {
            "message": f"Issue resolved for {merchant_id}",
            "stage": "in_progress",
            "impact": "Merchant health improved",
        },
        "complete": {
            "message": f"Migration completed for {merchant_id}",
            "stage": "completed",
            "impact": "Merchant fully migrated to headless",
        },
    }
    
    event_data = events.get(event_type, events["start"])
    
    return {
        "success": True,
        "timestamp": datetime.now().isoformat(),
        "merchant_id": merchant_id,
        "event_type": event_type,
        **event_data,
    }


@router.post("/generate-traffic")
async def generate_migration_traffic(count: int = 10) -> dict[str, Any]:
    """
    Generate random migration events/signals for simulation
    
    Args:
        count: Number of events to generate
    """
    merchants = get_merchants()
    if not merchants:
        return {
            "success": False,
            "generated_count": 0,
            "events": [],
            "message": "No merchant data available",
        }
    
    events = []
    stages = ["pre_migration", "in_progress", "post_migration", "fully_migrated"]
    
    for _ in range(count):
        merchant = random.choice(merchants)
        event_types = ["api_error", "webhook_failure", "migration_update", "health_check"]
        event_type = random.choice(event_types)
        
        event = {
            "event_type": event_type,
            "merchant_id": merchant["merchant_id"],
            "merchant_name": merchant["merchant_name"],
            "timestamp": datetime.now().isoformat(),
            "severity": random.choice(["low", "medium", "high"]),
        }
        
        if event_type == "api_error":
            event["error_code"] = random.choice(["API_500", "API_502", "API_TIMEOUT", "API_RATE_LIMIT"])
            event["endpoint"] = random.choice(["/orders", "/products", "/customers", "/checkout"])
        elif event_type == "webhook_failure":
            event["webhook_event"] = random.choice(["order.created", "product.updated", "customer.registered"])
            event["failure_reason"] = random.choice(["timeout", "invalid_payload", "endpoint_unreachable"])
        elif event_type == "migration_update":
            event["stage"] = random.choice(stages)
            event["progress"] = random.randint(0, 100)
        else:  # health_check
            event["health_score"] = round(random.uniform(0.5, 1.0), 2)
            event["checks_passed"] = random.randint(5, 10)
            event["checks_failed"] = random.randint(0, 3)
        
        events.append(event)
    
    return {
        "success": True,
        "generated_count": len(events),
        "events": events,
        "message": f"Generated {len(events)} simulation events",
    }
