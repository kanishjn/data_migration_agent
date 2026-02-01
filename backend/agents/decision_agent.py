"""
DECISION ENGINE
Determines what actions to take based on reasoning output.
Uses rules + LLM-assisted action generation with safety validation.
"""

from typing import List, Dict, Any
import json

try:
    from tools.llm_client import get_llm_client, DecisionOutputSchema
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False


class DecisionAgent:
    """
    Decides what actions to take based on root cause analysis.
    
    Decision rules:
    - High confidence + checkout impact → escalate to engineering
    - Medium confidence + multiple merchants → proactive communication
    - Low confidence → gather more data / human review
    
    All high-impact actions require human approval.
    
    Uses LLM to suggest actions, then validates with safety rules.
    """
    
    def __init__(self, use_llm: bool = False):
        self.use_llm = use_llm and LLM_AVAILABLE
        self.llm_client = None  # Lazy initialize
        
        self.confidence_threshold_high = 0.70
        self.confidence_threshold_medium = 0.50
        self.merchant_threshold_urgent = 10
        self.merchant_threshold_significant = 3
        
        if use_llm and not LLM_AVAILABLE:
            print("⚠️  LLM requested but not available. Using rule-based decisions.")
    
    def _get_llm_client(self):
        """Lazy initialize LLM client."""
        if self.llm_client is None and LLM_AVAILABLE:
            self.llm_client = get_llm_client()
        return self.llm_client
    
    def decide(self, reasoning: Dict[str, Any], observation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate decision based on reasoning and observation.
        
        Flow:
        1. If LLM enabled: Get LLM suggestions
        2. Apply safety rules and validate
        3. Add mandatory actions (audit trail, etc)
        4. Assess approval requirements
        
        Returns:
            Decision dict with recommended actions, risk levels, and approval requirements
        """
        primary_hyp = reasoning.get("primary_hypothesis")
        
        if not primary_hyp:
            return self._default_decision()
        
        # Try LLM-assisted decision first
        if self.use_llm:
            try:
                decision = self._decide_with_llm(reasoning, observation)
                # Validate and add safety checks
                return self._validate_and_enhance_decision(decision, reasoning, observation)
            except Exception as e:
                print(f"⚠️  LLM decision failed: {e}. Using rule-based fallback.")
        
        # Fallback to rule-based decision
        return self._decide_with_rules(reasoning, observation)
    
    def _decide_with_llm(self, reasoning: Dict, observation: Dict) -> Dict:
        """Use LLM to generate action recommendations."""
        
        client = self._get_llm_client()
        if not client or not client.client:
            raise RuntimeError("LLM client not available")
        
        prompt = self._build_decision_prompt(reasoning, observation)
        
        system_instruction = """You are a decision engine for an incident response system.

Given a root cause analysis and observed patterns, recommend specific actions.

AVAILABLE ACTION TYPES:
- engineering_escalation: Create high-priority engineering ticket
- proactive_merchant_communication: Send proactive message to affected merchants
- support_ticket_creation: Create internal support ticket
- knowledge_base_update: Update internal knowledge base
- docs_update_suggestion: Suggest documentation improvement
- internal_alert: Alert internal team (Slack/PagerDuty)
- monitoring_alert: Set up monitoring rule
- human_review_request: Queue for analyst review
- incident_report_draft: Generate incident report

SAFETY RULES (YOU MUST FOLLOW):
1. NEVER suggest actions that modify production code or configs
2. ALWAYS require approval for revenue-impacting actions
3. High confidence (>0.7) + checkout/payment issues = P0 escalation
4. Medium confidence (0.5-0.7) = support ticket + monitoring
5. Low confidence (<0.5) = human review only

RISK LEVELS: low, medium, high, critical
URGENCY LEVELS: low, normal, urgent, critical

Output JSON schema:
{
  "recommended_actions": [
    {
      "type": "action_type",
      "priority": "P0/P1/P2 (optional)",
      "reason": "Clear explanation",
      "details": {
        "key": "value"
      }
    }
  ],
  "risk_level": "low|medium|high|critical",
  "urgency": "low|normal|urgent|critical",
  "requires_human_approval": true|false,
  "reasoning": "Why these actions were chosen"
}"""
        
        result = client.generate(
            prompt=prompt,
            system_instruction=system_instruction,
            response_schema=DecisionOutputSchema,
            temperature=0.0,  # Deterministic for safety
            max_output_tokens=1000
        )
        
        return result
    
    def _build_decision_prompt(self, reasoning: Dict, observation: Dict) -> str:
        """Build prompt for LLM decision making."""
        
        primary_hyp = reasoning.get("primary_hypothesis", {})
        patterns = observation.get("patterns", [])
        severity = observation.get("severity_breakdown", {})
        
        # Calculate impact
        total_merchants = sum(p.get("affected_merchants", 0) for p in patterns if p.get("pattern_type") == "error_cluster")
        has_checkout_impact = any("CHECKOUT" in str(p) or "PAYMENT" in str(p) for p in patterns)
        
        prompt = f"""DECISION REQUEST

ROOT CAUSE ANALYSIS:
Primary Hypothesis: {primary_hyp.get('cause', 'Unknown')}
Confidence: {primary_hyp.get('confidence', 0.0):.2f}
Evidence: {', '.join(primary_hyp.get('evidence', [])[:3])}

IMPACT ASSESSMENT:
- Merchants Affected: {total_merchants}
- Checkout/Payment Impact: {'YES - REVENUE CRITICAL' if has_checkout_impact else 'No'}
- Critical Errors (5xx): {severity.get('critical', 0)}
- High Severity: {severity.get('high', 0)}

DETECTED PATTERNS:
{json.dumps(patterns, indent=2)[:500]}...

TASK:
Recommend specific actions to:
1. Mitigate the immediate impact
2. Prevent further merchant impact
3. Gather more information if needed
4. Document for future reference

Consider:
- Confidence level of the root cause
- Number of affected merchants
- Revenue impact (checkout/payment systems)
- Whether a workaround exists

Generate structured action recommendations."""
        
        return prompt
    
    def _validate_and_enhance_decision(self, decision: Dict, reasoning: Dict, observation: Dict) -> Dict:
        """
        Validate LLM-generated decision and apply safety rules.
        
        This ensures LLM suggestions comply with safety policies.
        """
        # Extract metrics
        primary_hyp = reasoning.get("primary_hypothesis", {})
        confidence = primary_hyp.get("confidence", 0.0)
        patterns = observation.get("patterns", [])
        severity = observation.get("severity_breakdown", {})
        
        total_merchants = sum(p.get("affected_merchants", 0) for p in patterns if p.get("pattern_type") == "error_cluster")
        has_checkout_impact = any("CHECKOUT" in str(p) or "PAYMENT" in str(p) for p in patterns)
        
        # Safety validation: Force approval for high-impact scenarios
        if has_checkout_impact or total_merchants >= self.merchant_threshold_significant:
            decision["requires_human_approval"] = True
        
        # Validate risk level
        if has_checkout_impact and confidence >= self.confidence_threshold_medium:
            decision["risk_level"] = "high"
            decision["urgency"] = "urgent"
        
        # Add mandatory incident report
        decision["recommended_actions"].append({
            "type": "incident_report_draft",
            "details": {
                "summary": observation.get("summary"),
                "root_cause": primary_hyp.get("cause"),
                "confidence": confidence,
                "impact": {
                    "merchants": total_merchants,
                    "severity": decision.get("risk_level")
                }
            }
        })
        
        # Add impact assessment
        decision["estimated_impact"] = {
            "merchants_affected": total_merchants,
            "revenue_impact": "high" if has_checkout_impact else "low",
            "support_ticket_volume": "high" if total_merchants >= self.merchant_threshold_urgent else "medium"
        }
        
        decision["blast_radius"] = self._assess_blast_radius(total_merchants, has_checkout_impact)
        decision["reasoning_summary"] = {
            "primary_cause": primary_hyp.get("cause"),
            "confidence": confidence,
            "key_evidence": primary_hyp.get("evidence", [])
        }
        
        return decision
    
    def _decide_with_rules(self, reasoning: Dict, observation: Dict) -> Dict:
        """Rule-based decision making (original logic)."""
        primary_hyp = reasoning.get("primary_hypothesis")
        confidence = primary_hyp.get("confidence", 0.0)
        cause = primary_hyp.get("cause", "")
        
        # Extract impact metrics from observation
        patterns = observation.get("patterns", [])
        severity_breakdown = observation.get("severity_breakdown", {})
        
        total_merchants = sum(p.get("affected_merchants", 0) for p in patterns if p.get("pattern_type") == "error_cluster")
        has_critical_errors = severity_breakdown.get("critical", 0) > 0
        has_checkout_impact = any("CHECKOUT" in str(p) or "PAYMENT" in str(p) for p in patterns)
        
        # Decision logic
        actions = []
        risk_level = "low"
        requires_approval = False
        urgency = "normal"
        
        # CRITICAL PATH: Revenue-impacting errors
        if has_checkout_impact and confidence >= self.confidence_threshold_medium:
            urgency = "urgent"
            risk_level = "high"
            requires_approval = True
            
            actions.append({
                "type": "engineering_escalation",
                "priority": "P0",
                "reason": "Revenue-impacting checkout failures detected",
                "details": {
                    "affected_merchants": total_merchants,
                    "root_cause": cause,
                    "confidence": confidence
                }
            })
            
            if total_merchants >= self.merchant_threshold_significant:
                actions.append({
                    "type": "proactive_merchant_communication",
                    "target": "affected_merchants",
                    "channel": "email_and_dashboard",
                    "message_template": "checkout_issue_proactive",
                    "details": {
                        "merchant_count": total_merchants,
                        "workaround_available": self._has_workaround(cause)
                    }
                })
        
        # HIGH CONFIDENCE: Clear root cause identified
        elif confidence >= self.confidence_threshold_high:
            risk_level = "medium"
            requires_approval = True
            
            if total_merchants >= self.merchant_threshold_significant:
                actions.append({
                    "type": "proactive_merchant_communication",
                    "target": "affected_merchants",
                    "channel": "email",
                    "message_template": self._select_message_template(cause),
                    "details": {
                        "merchant_count": total_merchants,
                        "root_cause": cause,
                        "resolution_eta": self._estimate_resolution_time(cause)
                    }
                })
            
            actions.append({
                "type": "knowledge_base_update",
                "reason": "Common issue identified",
                "details": {
                    "title": f"Migration Issue: {cause}",
                    "category": "migration",
                    "priority": "high"
                }
            })
            
            if "documentation" in cause.lower() or "guide" in cause.lower():
                actions.append({
                    "type": "docs_update_suggestion",
                    "target": "migration_guide",
                    "reason": "Gap identified in migration documentation"
                })
        
        # MEDIUM CONFIDENCE: Probable cause but uncertainty
        elif confidence >= self.confidence_threshold_medium:
            risk_level = "medium"
            requires_approval = True
            
            actions.append({
                "type": "support_ticket_creation",
                "priority": "P2",
                "reason": "Pattern detected across multiple merchants",
                "details": {
                    "merchant_count": total_merchants,
                    "probable_cause": cause,
                    "confidence": confidence
                }
            })
            
            if total_merchants >= self.merchant_threshold_significant:
                actions.append({
                    "type": "internal_alert",
                    "channel": "slack",
                    "target": "#merchant-success",
                    "reason": "Emerging issue pattern"
                })
        
        # LOW CONFIDENCE: Need more investigation
        else:
            risk_level = "low"
            requires_approval = False
            
            actions.append({
                "type": "monitoring_alert",
                "reason": "Low confidence - continue monitoring",
                "details": {
                    "pattern_count": len(patterns),
                    "suggested_action": "Gather more data points"
                }
            })
            
            actions.append({
                "type": "human_review_request",
                "reason": "Insufficient confidence for automated action",
                "details": {
                    "confidence": confidence,
                    "unknowns": reasoning.get("unknowns", [])
                }
            })
        
        # ALWAYS: Create incident report for audit trail
        actions.append({
            "type": "incident_report_draft",
            "details": {
                "summary": observation.get("summary"),
                "root_cause": cause,
                "confidence": confidence,
                "impact": {
                    "merchants": total_merchants,
                    "severity": risk_level
                }
            }
        })
        
        return {
            "recommended_actions": actions,
            "requires_human_approval": requires_approval,
            "risk_level": risk_level,
            "urgency": urgency,
            "blast_radius": self._assess_blast_radius(total_merchants, has_checkout_impact),
            "estimated_impact": {
                "merchants_affected": total_merchants,
                "revenue_impact": "high" if has_checkout_impact else "low",
                "support_ticket_volume": "high" if total_merchants >= self.merchant_threshold_urgent else "medium"
            },
            "reasoning_summary": {
                "primary_cause": cause,
                "confidence": confidence,
                "key_evidence": primary_hyp.get("evidence", [])
            }
        }
    
    def _default_decision(self) -> Dict:
        """Default decision when no clear reasoning available."""
        return {
            "recommended_actions": [{
                "type": "manual_review",
                "reason": "Insufficient data for automated decision"
            }],
            "requires_human_approval": True,
            "risk_level": "unknown",
            "urgency": "normal",
            "blast_radius": "unknown"
        }
    
    def _assess_blast_radius(self, merchant_count: int, checkout_impact: bool) -> str:
        """Assess potential blast radius of actions."""
        if checkout_impact and merchant_count >= self.merchant_threshold_urgent:
            return "critical - widespread revenue impact"
        elif merchant_count >= self.merchant_threshold_urgent:
            return "high - many merchants affected"
        elif merchant_count >= self.merchant_threshold_significant:
            return "medium - multiple merchants"
        else:
            return "low - isolated incidents"
    
    def _select_message_template(self, cause: str) -> str:
        """Select appropriate message template based on cause."""
        cause_lower = cause.lower()
        
        if "webhook" in cause_lower:
            return "webhook_configuration_issue"
        elif "auth" in cause_lower or "token" in cause_lower:
            return "authentication_migration_guide"
        elif "checkout" in cause_lower or "payment" in cause_lower:
            return "checkout_troubleshooting"
        elif "rate limit" in cause_lower:
            return "rate_limit_guidance"
        else:
            return "general_migration_issue"
    
    def _has_workaround(self, cause: str) -> bool:
        """Check if a workaround exists for this issue."""
        # In production, this would check a knowledge base
        workaround_keywords = ["configuration", "webhook", "documentation", "token"]
        return any(kw in cause.lower() for kw in workaround_keywords)
    
    def _estimate_resolution_time(self, cause: str) -> str:
        """Estimate resolution timeline."""
        cause_lower = cause.lower()
        
        if "documentation" in cause_lower:
            return "immediate - docs will be updated"
        elif "configuration" in cause_lower:
            return "< 1 hour - merchant can self-resolve"
        elif "platform" in cause_lower or "regression" in cause_lower:
            return "2-4 hours - engineering fix required"
        else:
            return "investigating"