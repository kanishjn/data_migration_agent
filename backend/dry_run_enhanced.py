#!/usr/bin/env python3
"""
Enhanced LLM Dry Run - Demonstrates full action execution with tool integration.
Shows the complete agent loop including action execution with tools.
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add backend to path
import sys
sys.path.insert(0, str(Path(__file__).parent))

from orchestrator.agent_orchestrator import AgentOrchestrator


def print_section(title: str, content: any):
    """Print a formatted section."""
    print(f"\n{'='*80}")
    print(f" {title}")
    print('='*80)
    if isinstance(content, dict):
        print(json.dumps(content, indent=2, default=str))
    else:
        print(content)


def main():
    print("\n🤖 MIGRATION INCIDENT AGENT - FULL EXECUTION DEMO")
    print("="*80)
    
    # Check for API key
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    use_llm = bool(api_key)
    
    if use_llm:
        print("\n✅ Gemini API key found")
        print("🧠 LLM mode ENABLED - Using Google Gemini for reasoning")
    else:
        print("\n⚠️  No Gemini API key found")
        print("📝 Running in heuristic mode")
    
    # Load simulation data
    events_path = Path(__file__).parent / "simulations" / "api_errors_enhanced.json"
    if not events_path.exists():
        events_path = Path(__file__).parent / "simulations" / "api_errors.json"
    
    with open(events_path) as f:
        events = json.load(f)
    
    print(f"\n📥 Loaded {len(events)} events from simulation data")
    
    # Initialize orchestrator
    orchestrator = AgentOrchestrator(dry_run=True, use_llm=use_llm)
    print(f"🤖 LLM mode: {'ENABLED' if use_llm else 'DISABLED'}")
    
    # Check tool status
    tool_status = orchestrator.actor.get_tool_status()
    print(f"\n🔧 Tool Status:")
    for tool, available in tool_status.items():
        status = "✅" if available else "❌"
        print(f"   {status} {tool}")
    
    print(f"\n🔄 Running agent loop: Observe → Reason → Decide → Act")
    print("-"*80)
    
    # Step 1: Run without approval (actions will be pending)
    print("\n📋 PHASE 1: Analysis (Without Approval)")
    result = orchestrator.run(events)
    
    print_section("1️⃣  OBSERVATION (Pattern Detection)", result["observation"])
    print_section("2️⃣  REASONING (Root Cause Hypothesis)", result["reasoning"])
    print_section("3️⃣  DECISION (Recommended Actions)", result["decision"])
    print_section("4️⃣  EXECUTION (Pending Approval)", result["execution"])
    
    # Step 2: Run with approval to demonstrate action execution
    print("\n" + "="*80)
    print(" 📋 PHASE 2: Execute with Approval")
    print("="*80)
    print("\n🔓 Simulating human approval...")
    
    # Get the decision from previous run and execute with approval
    # Pass observation and reasoning for database storage
    decision = result["decision"]
    observation = result["observation"]
    reasoning = result["reasoning"]
    
    execution_result = orchestrator.actor.act(
        decision, 
        approved=True,
        observation=observation,
        reasoning=reasoning
    )
    
    print_section("5️⃣  EXECUTION (Approved Actions)", execution_result)
    
    # Show detailed action results
    if execution_result.get("executed_actions"):
        print("\n" + "="*80)
        print(" 🎯 DETAILED ACTION RESULTS")
        print("="*80)
        
        for i, action_result in enumerate(execution_result["executed_actions"], 1):
            action_type = action_result.get("action_type", "unknown")
            success = "✅" if action_result.get("success") else "❌"
            
            print(f"\n{i}. {success} {action_type}")
            
            # Show key details based on action type
            if action_type == "engineering_escalation":
                jira = action_result.get("jira_ticket", {})
                print(f"   📝 Jira Ticket: {jira.get('jira_id', 'N/A')}")
                print(f"   🔗 URL: {jira.get('jira_url', 'N/A')}")
                if action_result.get("slack_alert"):
                    slack = action_result["slack_alert"]
                    print(f"   💬 Slack Alert: {slack.get('channel', 'N/A')}")
            
            elif action_type == "proactive_merchant_communication":
                print(f"   📧 Status: {action_result.get('status', 'N/A')}")
                print(f"   👥 Target Merchants: {action_result.get('target_merchant_count', 0)}")
                print(f"   📝 Message Preview:")
                preview = action_result.get("message_preview", "")[:200]
                for line in preview.split("\n")[:5]:
                    if line.strip():
                        print(f"      {line.strip()}")
            
            elif action_type == "incident_report_draft":
                report = action_result.get("report", {})
                print(f"   📋 Report ID: {action_result.get('report_id', 'N/A')}")
                print(f"   📌 Title: {report.get('title', 'N/A')}")
                print(f"   🔍 Root Cause: {report.get('root_cause', {}).get('summary', 'N/A')}")
    
    # Audit trail
    print("\n" + "="*80)
    print(" 📜 AUDIT TRAIL")
    print("="*80)
    audit = execution_result.get("audit_trail", {})
    print(f"   • Total Actions: {audit.get('total_actions', 0)}")
    print(f"   • Successful: {audit.get('successful', 0)}")
    print(f"   • Failed: {audit.get('failed', 0)}")
    print(f"   • Execution Mode: {audit.get('execution_mode', 'unknown')}")
    print(f"   • Timestamp: {audit.get('timestamp', 'N/A')}")
    
    # Summary
    print("\n" + "="*80)
    print(" 📊 EXECUTION SUMMARY")
    print("="*80)
    
    primary = result["reasoning"].get("primary_hypothesis", {})
    decision = result["decision"]
    
    print(f"""
✅ Analysis Complete:
   • Events processed: {len(events)}
   • Patterns detected: {len(result['observation'].get('patterns', []))}
   • Primary cause: {primary.get('cause', 'Unknown')}
   • Confidence: {int(primary.get('confidence', 0) * 100)}%
   • Analysis method: {result['reasoning'].get('analysis_method', 'Unknown').upper()}
   • Actions executed: {audit.get('total_actions', 0)}
   • Successful: {audit.get('successful', 0)}
   • Risk level: {decision.get('risk_level', 'Unknown').upper()}
""")
    
    # LLM usage stats
    if use_llm:
        try:
            from tools.llm_client import get_llm_client
            client = get_llm_client()
            if client:
                stats = client.get_usage_stats()
                print(f"""💰 LLM Usage:
   • Total calls: {stats.get('total_calls', 0)}
   • Input tokens: {stats.get('total_input_tokens', 0):,}
   • Output tokens: {stats.get('total_output_tokens', 0):,}
   • Estimated cost: ${stats.get('estimated_cost_usd', 0):.4f}
""")
        except Exception:
            pass
    
    # Show database contents
    print("\n" + "="*80)
    print(" 💾 DATABASE CONTENTS")
    print("="*80)
    try:
        from memory.memory_manager import MemoryManager
        memory = MemoryManager()
        recent_incidents = memory.get_recent_incidents(limit=3)
        
        if recent_incidents:
            print(f"\n📝 Recent Incidents (Last {len(recent_incidents)}):\n")
            for incident in recent_incidents:
                print(f"   ID: {incident['id']}")
                print(f"   Signal: {incident['signal_cluster']}")
                print(f"   Root Cause: {incident['root_cause']}")
                print(f"   Confidence: {incident['confidence']:.2%}")
                print(f"   Outcome: {incident['outcome']}")
                print(f"   Created: {incident['created_at']}")
                print(f"   Actions: {len(incident.get('action_taken', [])) if isinstance(incident.get('action_taken'), list) else 'N/A'}")
                print()
        else:
            print("   No incidents recorded yet.")
    except Exception as e:
        print(f"   ⚠️  Could not load database: {e}")
    
    print("="*80)
    print("✨ Demo complete! The agent executed actions using platform tools.")
    print("   All actions were simulated (dry_run=True) for safety.")
    print("="*80)


if __name__ == "__main__":
    main()
