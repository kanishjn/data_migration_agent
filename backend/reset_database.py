#!/usr/bin/env python3
"""
Reset Database Script

Clears all data from the agent database:
- Events
- Incidents
- Pending actions
- Agent state
- Logs (if applicable)

Usage:
    python reset_database.py           # Interactive confirmation
    python reset_database.py --force   # Skip confirmation
    python reset_database.py --stats   # Show stats without deleting
"""

import argparse
import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from memory.event_store import get_event_store
from memory.memory_manager import MemoryManager


def get_database_stats(db_path: str) -> dict:
    """Get counts of all tables."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    stats = {}
    
    # Events table
    try:
        cursor.execute("SELECT COUNT(*) FROM events")
        stats['events'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM events WHERE processed = 0")
        stats['events_unprocessed'] = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        stats['events'] = 0
        stats['events_unprocessed'] = 0
    
    # Incidents table
    try:
        cursor.execute("SELECT COUNT(*) FROM incidents")
        stats['incidents'] = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        stats['incidents'] = 0
    
    # Pending actions table
    try:
        cursor.execute("SELECT COUNT(*) FROM pending_actions")
        stats['pending_actions'] = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM pending_actions WHERE status = 'pending'")
        stats['actions_pending'] = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        stats['pending_actions'] = 0
        stats['actions_pending'] = 0
    
    # Confidence history
    try:
        cursor.execute("SELECT COUNT(*) FROM confidence_history")
        stats['confidence_history'] = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        stats['confidence_history'] = 0
    
    # Hypotheses
    try:
        cursor.execute("SELECT COUNT(*) FROM hypotheses")
        stats['hypotheses'] = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        stats['hypotheses'] = 0
    
    # Feedback
    try:
        cursor.execute("SELECT COUNT(*) FROM feedback")
        stats['feedback'] = cursor.fetchone()[0]
    except sqlite3.OperationalError:
        stats['feedback'] = 0
    
    conn.close()
    return stats


def clear_database(db_path: str) -> dict:
    """Clear all tables. Returns deletion counts."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    deleted = {}
    
    # Clear events
    try:
        cursor.execute("SELECT COUNT(*) FROM events")
        deleted['events'] = cursor.fetchone()[0]
        cursor.execute("DELETE FROM events")
    except sqlite3.OperationalError:
        deleted['events'] = 0
    
    # Clear incidents
    try:
        cursor.execute("SELECT COUNT(*) FROM incidents")
        deleted['incidents'] = cursor.fetchone()[0]
        cursor.execute("DELETE FROM incidents")
    except sqlite3.OperationalError:
        deleted['incidents'] = 0
    
    # Clear pending actions
    try:
        cursor.execute("SELECT COUNT(*) FROM pending_actions")
        deleted['pending_actions'] = cursor.fetchone()[0]
        cursor.execute("DELETE FROM pending_actions")
    except sqlite3.OperationalError:
        deleted['pending_actions'] = 0
    
    # Clear confidence history
    try:
        cursor.execute("SELECT COUNT(*) FROM confidence_history")
        deleted['confidence_history'] = cursor.fetchone()[0]
        cursor.execute("DELETE FROM confidence_history")
    except sqlite3.OperationalError:
        deleted['confidence_history'] = 0
    
    # Clear hypotheses
    try:
        cursor.execute("SELECT COUNT(*) FROM hypotheses")
        deleted['hypotheses'] = cursor.fetchone()[0]
        cursor.execute("DELETE FROM hypotheses")
    except sqlite3.OperationalError:
        deleted['hypotheses'] = 0
    
    # Clear feedback
    try:
        cursor.execute("SELECT COUNT(*) FROM feedback")
        deleted['feedback'] = cursor.fetchone()[0]
        cursor.execute("DELETE FROM feedback")
    except sqlite3.OperationalError:
        deleted['feedback'] = 0
    
    # Reset auto-increment counters
    cursor.execute("DELETE FROM sqlite_sequence")
    
    conn.commit()
    conn.close()
    
    return deleted


def print_stats(stats: dict):
    """Pretty print database statistics."""
    print("\n" + "=" * 60)
    print("  DATABASE STATISTICS")
    print("=" * 60)
    print(f"  Events (total):           {stats['events']:,}")
    print(f"  Events (unprocessed):     {stats['events_unprocessed']:,}")
    print(f"  Incidents:                {stats['incidents']:,}")
    print(f"  Pending actions (total):  {stats['pending_actions']:,}")
    print(f"  Pending actions (open):   {stats['actions_pending']:,}")
    print(f"  Confidence history:       {stats['confidence_history']:,}")
    print(f"  Hypotheses:               {stats['hypotheses']:,}")
    print(f"  Feedback:                 {stats['feedback']:,}")
    print("=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Reset the agent database",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--force", 
        action="store_true", 
        help="Skip confirmation prompt"
    )
    parser.add_argument(
        "--stats", 
        action="store_true", 
        help="Show statistics only (don't delete)"
    )
    args = parser.parse_args()
    
    # Get database path
    event_store = get_event_store()
    db_path = event_store.db_path
    
    print(f"\n📁 Database: {db_path}")
    
    # Get current stats
    stats = get_database_stats(db_path)
    print_stats(stats)
    
    # If --stats flag, just show and exit
    if args.stats:
        print("  ℹ️  Stats only mode. Use without --stats to clear database.\n")
        return
    
    # Check if database is already empty
    total_records = sum([
        stats['events'],
        stats['incidents'],
        stats['pending_actions'],
        stats['confidence_history'],
        stats['hypotheses'],
        stats['feedback']
    ])
    
    if total_records == 0:
        print("  ✅ Database is already empty. Nothing to delete.\n")
        return
    
    # Confirmation prompt
    if not args.force:
        print("  ⚠️  WARNING: This will delete ALL data from the database!")
        print("  This action cannot be undone.")
        response = input("\n  Type 'YES' to confirm deletion: ")
        
        if response != "YES":
            print("\n  ❌ Deletion cancelled.\n")
            return
    
    # Clear database
    print("\n  🗑️  Clearing database...")
    deleted = clear_database(db_path)
    
    print("\n" + "=" * 60)
    print("  DELETION COMPLETE")
    print("=" * 60)
    print(f"  Events deleted:           {deleted['events']:,}")
    print(f"  Incidents deleted:        {deleted['incidents']:,}")
    print(f"  Pending actions deleted:  {deleted['pending_actions']:,}")
    print(f"  Confidence hist. deleted: {deleted['confidence_history']:,}")
    print(f"  Hypotheses deleted:       {deleted['hypotheses']:,}")
    print(f"  Feedback deleted:         {deleted['feedback']:,}")
    print("=" * 60)
    
    # Verify database is empty
    new_stats = get_database_stats(db_path)
    new_total = sum([
        new_stats['events'],
        new_stats['incidents'],
        new_stats['pending_actions'],
        new_stats['confidence_history'],
        new_stats['hypotheses'],
        new_stats['feedback']
    ])
    
    if new_total == 0:
        print("\n  ✅ Database successfully reset to empty state.\n")
    else:
        print(f"\n  ⚠️  Warning: {new_total} records still remain.\n")


if __name__ == "__main__":
    main()
