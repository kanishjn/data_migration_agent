"""
LLM-Powered Dry Run Script
Demonstrates the full agent loop with Google Gemini integration
"""

import json
import os
from pathlib import Path
from orchestrator import AgentOrchestrator

# Load environment variables from .env file
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    with open(env_file) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()


def print_section(title: str, content: dict):
    """Pretty print a section."""
    print(f"\n{'='*80}")
    print(f" {title}")
    print('='*80)
    print(json.dumps(content, indent=2))


def main():
    print("\n🤖 MIGRATION INCIDENT AGENT - LLM-POWERED MODE")
    print("="*80)
    
    # Check for API key
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("\n⚠️  WARNING: No Gemini API key found!")
        print("Set GEMINI_API_KEY or GOOGLE_API_KEY environment variable to enable LLM mode.")
        print("Example: export GEMINI_API_KEY='your-api-key-here'")
        print("\nRunning in HEURISTIC mode instead...\n")
        use_llm = False
    else:
        print(f"\n✅ Gemini API key found")
        print("🧠 LLM mode ENABLED - Using Google Gemini for reasoning and decisions\n")
        use_llm = True
    
    # Load simulation data
    with open("simulations/api_errors_enhanced.json") as f:
        events = json.load(f)
    
    print(f"📥 Loaded {len(events)} events from simulation data")
    
    # Initialize orchestrator with LLM enabled
    orchestrator = AgentOrchestrator(
        dry_run=True,      # Safe mode - won't actually execute actions
        use_llm=use_llm    # Use LLM if API key available
    )
    
    print("\n🔄 Running agent loop: Observe → Reason → Decide → Act")
    
    # Run the full pipeline
    result = orchestrator.run(events, auto_approve=False)
    
    # Display results
    print_section("1️⃣  OBSERVATION (Pattern Detection - No LLM)", result["observation"])
    print_section("2️⃣  REASONING (Root Cause Hypothesis" + (" - LLM Powered" if use_llm else " - Heuristic") + ")", result["reasoning"])
    print_section("3️⃣  DECISION (Recommended Actions" + (" - LLM Assisted" if use_llm else " - Rule Based") + ")", result["decision"])
    print_section("4️⃣  EXECUTION (Action Status)", result["execution"])
    
    # Summary
    print("\n" + "="*80)
    print("📊 EXECUTION SUMMARY")
    print("="*80)
    
    obs = result["observation"]
    reasoning = result["reasoning"]
    decision = result["decision"]
    
    print(f"\n✅ Analysis Complete:")
    print(f"   • Events processed: {obs['raw_event_count']}")
    print(f"   • Patterns detected: {len(obs['patterns'])}")
    print(f"   • Primary cause: {reasoning['primary_hypothesis']['cause']}")
    print(f"   • Confidence: {reasoning['primary_hypothesis']['confidence']:.0%}")
    print(f"   • Analysis method: {reasoning.get('analysis_method', 'unknown').upper()}")
    print(f"   • Actions recommended: {len(decision['recommended_actions'])}")
    print(f"   • Risk level: {decision['risk_level'].upper()}")
    print(f"   • Requires approval: {decision['requires_human_approval']}")
    
    # Show LLM usage if available
    if use_llm:
        try:
            from tools.llm_client import llm_client
            stats = llm_client.get_usage_stats()
            print(f"\n💰 LLM Usage:")
            print(f"   • Total calls: {stats['total_calls']}")
            print(f"   • Input tokens: {stats['total_input_tokens']:,}")
            print(f"   • Output tokens: {stats['total_output_tokens']:,}")
            print(f"   • Estimated cost: ${stats['estimated_cost_usd']:.4f}")
        except:
            pass
    
    print("\n" + "="*80)
    if use_llm:
        print("✨ Demo complete! The agent used Google Gemini to analyze patterns,")
        print("   generate hypotheses, and recommend actions with human-like reasoning.")
    else:
        print("✨ Demo complete using heuristic mode!")
        print("   Set GEMINI_API_KEY to enable LLM-powered reasoning.")
    print("="*80 + "\n")


if __name__ == "__main__":
    main()
