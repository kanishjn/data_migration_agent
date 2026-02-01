"""
AGENT ORCHESTRATOR
Coordinates the agent loop: Observe → Reason → Decide → Act

This is the main entry point for the agentic system.
"""

from agents.observer_agent import ObserverAgent
from agents.reasoning_agent import ReasoningAgent
from agents.decision_agent import DecisionAgent
from agents.action_agent import ActionAgent
from typing import Dict, Any, List
import json


class AgentOrchestrator:
    """
    Orchestrates the full agent pipeline.
    
    Flow:
    1. OBSERVE: Detect patterns in incoming signals
    2. REASON: Generate root cause hypotheses
    3. DECIDE: Determine appropriate actions
    4. ACT: Execute approved actions (with guardrails)
    """
    
    def __init__(self, dry_run: bool = True, use_llm: bool = False):
        """
        Initialize the agent system.
        
        Args:
            dry_run: If True, actions won't actually execute (safe for demo)
            use_llm: If True, use LLM for reasoning/decisions (requires API key)
        """
        self.observer = ObserverAgent(spike_threshold=2)  # Lower threshold for demo
        self.reasoner = ReasoningAgent(use_llm=use_llm)
        self.decider = DecisionAgent(use_llm=use_llm)
        self.actor = ActionAgent(dry_run=dry_run, use_llm=use_llm)
        
        self.dry_run = dry_run
        self.use_llm = use_llm
        self.execution_history = []
        
        if use_llm:
            print("🤖 LLM mode ENABLED - Using Google Gemini for reasoning and decisions")
    
    def run(self, events: List[Dict], context: Dict = None, auto_approve: bool = False) -> Dict[str, Any]:
        """
        Run the full agent loop on a set of events.
        
        Args:
            events: List of normalized event dicts (errors, tickets, etc)
            context: Optional context (known issues, recent changes, docs)
            auto_approve: If True, auto-approve actions (USE CAREFULLY)
        
        Returns:
            Complete execution report with all agent outputs
        """
        if context is None:
            context = self._load_default_context()
        
        # STEP 1: OBSERVE
        observation = self.observer.observe(events)
        
        # STEP 2: REASON
        reasoning = self.reasoner.reason(observation, context)
        
        # STEP 3: DECIDE
        decision = self.decider.decide(reasoning, observation)
        
        # STEP 4: ACT (with approval gate)
        requires_approval = decision.get("requires_human_approval", False)
        
        if requires_approval and not auto_approve:
            # In production, this would wait for human approval
            # For demo, we'll include a "pending approval" state
            execution = {
                "status": "pending_approval",
                "message": "Actions require human approval before execution",
                "approval_required": True,
                "actions_pending": decision.get("recommended_actions", [])
            }
        else:
            # Execute actions
            execution = self.actor.act(decision, approved=auto_approve)
        
        # Compile full report
        report = {
            "observation": observation,
            "reasoning": reasoning,
            "decision": decision,
            "execution": execution,
            "metadata": {
                "dry_run": self.dry_run,
                "auto_approved": auto_approve,
                "events_processed": len(events)
            }
        }
        
        # Store in history
        self.execution_history.append(report)
        
        return report
    
    def run_with_approval(self, events: List[Dict], context: Dict = None) -> Dict[str, Any]:
        """
        Run with manual approval step (realistic production flow).
        
        Returns a decision that needs approval, then call approve_and_execute().
        """
        if context is None:
            context = self._load_default_context()
        
        # Run observe → reason → decide
        observation = self.observer.observe(events)
        reasoning = self.reasoner.reason(observation, context)
        decision = self.decider.decide(reasoning, observation)
        
        return {
            "observation": observation,
            "reasoning": reasoning,
            "decision": decision,
            "status": "awaiting_approval",
            "message": "Review the decision and call approve_and_execute() to proceed"
        }
    
    def approve_and_execute(self, decision: Dict) -> Dict:
        """
        Execute a previously approved decision.
        
        Args:
            decision: Decision dict from run_with_approval()
        
        Returns:
            Execution result
        """
        return self.actor.act(decision, approved=True)
    
    def get_execution_summary(self) -> Dict:
        """Get summary of all executions in this session."""
        if not self.execution_history:
            return {"message": "No executions yet"}
        
        return {
            "total_executions": len(self.execution_history),
            "summary": [
                {
                    "execution_id": i,
                    "events_processed": h["metadata"]["events_processed"],
                    "patterns_detected": len(h["observation"].get("patterns", [])),
                    "confidence": h["reasoning"].get("primary_hypothesis", {}).get("confidence"),
                    "actions_taken": len(h["decision"].get("recommended_actions", [])),
                    "status": h["execution"].get("status")
                }
                for i, h in enumerate(self.execution_history)
            ]
        }
    
    def _load_default_context(self) -> Dict:
        """
        Load default context (known issues, recent changes, etc).
        
        In production, this would query:
        - Knowledge base
        - Recent deployments
        - Open incidents
        - Migration playbooks
        """
        return {
            "known_issues": [
                {
                    "issue": "Webhook endpoint v2 deprecated",
                    "affected_versions": ["v2"],
                    "resolution": "Update to v3 endpoint",
                    "doc_url": "https://docs.platform.com/webhooks/migration"
                },
                {
                    "issue": "Headless checkout requires HTTPS callbacks",
                    "affected_feature": "headless_checkout",
                    "resolution": "Update callback URLs to use HTTPS",
                    "doc_url": "https://docs.platform.com/checkout/headless"
                },
                {
                    "issue": "API tokens v2 incompatible with v3 endpoints",
                    "affected_versions": ["v2", "v3"],
                    "resolution": "Regenerate API tokens in dashboard",
                    "doc_url": "https://docs.platform.com/auth/migration"
                }
            ],
            "recent_changes": [
                {
                    "change": "Deployed checkout-service v3.2",
                    "date": "2026-01-30",
                    "impact": "Stricter webhook URL validation"
                },
                {
                    "change": "Migrated 50 merchants to headless",
                    "date": "2026-01-29",
                    "impact": "Session timeout changed from 30min to 15min"
                }
            ],
            "migration_stages": [
                "pre_migration",
                "during_migration",
                "post_migration",
                "fully_migrated"
            ]
        }