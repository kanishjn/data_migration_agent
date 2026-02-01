#!/usr/bin/env python3
"""
View incidents stored in the database.
"""

import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from memory.memory_manager import MemoryManager


def main():
    print("\n" + "="*80)
    print(" 💾 AGENT MEMORY DATABASE - INCIDENT VIEWER")
    print("="*80)
    
    memory = MemoryManager()
    
    # Get recent incidents
    print("\n📋 Recent Incidents:\n")
    incidents = memory.get_recent_incidents(limit=10)
    
    if not incidents:
        print("   No incidents found in database.")
        return
    
    for incident in incidents:
        print("-" * 80)
        print(f"   ID: {incident['id']}")
        print(f"   Created: {incident['created_at']}")
        print(f"   Signal Cluster: {incident['signal_cluster']}")
        print(f"   Root Cause: {incident['root_cause']}")
        print(f"   Confidence: {incident['confidence']:.2%}")
        print(f"   Outcome: {incident['outcome']}")
        
        # Show actions if available
        actions = incident.get('action_taken')
        if actions and isinstance(actions, list):
            print(f"\n   Actions Taken ({len(actions)}):")
            for i, action in enumerate(actions, 1):
                action_type = action.get('action_type', 'unknown')
                success = "✅" if action.get('success') else "❌"
                print(f"      {i}. {success} {action_type}")
                
                # Show key details
                if action_type == "engineering_escalation":
                    jira = action.get('jira_ticket', {}).get('data', {})
                    if jira:
                        print(f"         Jira: {jira.get('jira_id', 'N/A')}")
                elif action_type == "proactive_merchant_communication":
                    print(f"         Merchants: {action.get('target_merchant_count', 0)}")
                    print(f"         Status: {action.get('status', 'N/A')}")
        else:
            print(f"   Actions: None recorded")
        
        print()
    
    # Show confidence history
    print("\n" + "="*80)
    print(" 📈 CONFIDENCE HISTORY (Last 7 days)")
    print("="*80 + "\n")
    
    history = memory.get_confidence_history(days=7)
    if history:
        for entry in history[:10]:  # Show last 10
            print(f"   {entry['recorded_at']}: {entry['confidence']:.2%} - {entry['signal_cluster'][:60]}")
    else:
        print("   No confidence history found.")
    
    # Show success rate by root cause
    print("\n" + "="*80)
    print(" 📊 SUCCESS RATES BY ROOT CAUSE")
    print("="*80 + "\n")
    
    stats = memory.get_success_rate_by_root_cause()
    if stats:
        for root_cause, data in stats.items():
            print(f"   {root_cause}:")
            print(f"      Total: {data['total_incidents']}")
            print(f"      Successes: {data['successful_resolutions']}")
            print(f"      Success Rate: {data['success_rate']:.1%}")
            print(f"      Avg Confidence: {data['average_confidence']:.2%}")
            print()
    else:
        print("   No statistics available yet (need outcomes recorded).")
    
    print("="*80)


if __name__ == "__main__":
    main()
