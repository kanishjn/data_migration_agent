"""
REASONING AGENT
Root cause hypothesis generation using LLM.
Generates evidence-based hypotheses with confidence scores.
"""

from typing import List, Dict, Any
import json

try:
    from tools.llm_client import get_llm_client, ReasoningOutputSchema
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False

try:
    from tools.retrieval import get_grounding_context
    RETRIEVAL_AVAILABLE = True
except ImportError:
    RETRIEVAL_AVAILABLE = False


class ReasoningAgent:
    """
    Generates root cause hypotheses based on observed patterns.
    
    Uses LLM to:
    - Correlate patterns with known issues
    - Generate explanations
    - Assess confidence based on evidence
    """
    
    def __init__(self, use_llm: bool = False):
        self.use_llm = use_llm and LLM_AVAILABLE
        self.llm_client = None  # Lazy initialize
        
        if use_llm and not LLM_AVAILABLE:
            print("⚠️  LLM requested but not available. Falling back to heuristics.")
    
    def _get_llm_client(self):
        """Lazy initialize LLM client."""
        if self.llm_client is None and LLM_AVAILABLE:
            self.llm_client = get_llm_client()
        return self.llm_client
    
    def reason(self, observation: Dict[str, Any], context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Generate root cause hypotheses from observation patterns.
        
        Args:
            observation: Output from ObserverAgent
            context: Additional context (known issues, recent changes, docs)
        
        Returns:
            Hypothesis set with confidence scores and evidence
        """
        patterns = observation.get("patterns", [])
        
        if not patterns:
            return {
                "primary_hypothesis": None,
                "alternative_hypotheses": [],
                "confidence": 0.0,
                "evidence": [],
                "unknowns": ["Insufficient data for analysis"]
            }
        
        if self.use_llm:
            return self._reason_with_llm(observation, context)
        else:
            return self._reason_with_heuristics(observation, context)
    
    def _reason_with_heuristics(self, observation: Dict, context: Dict = None) -> Dict:
        """Rule-based reasoning without LLM (for demo/testing)."""
        patterns = observation.get("patterns", [])
        severity_breakdown = observation.get("severity_breakdown", {})
        
        # Analyze pattern types
        has_migration_correlation = any(p["pattern_type"] == "migration_correlation" for p in patterns)
        has_error_cluster = any(p["pattern_type"] == "error_cluster" for p in patterns)
        
        # Find dominant error codes
        error_codes = []
        affected_merchants_total = 0
        
        for pattern in patterns:
            if pattern["pattern_type"] == "error_cluster":
                error_codes.append(pattern["error_code"])
                affected_merchants_total += pattern["affected_merchants"]
        
        # Generate hypothesis based on patterns
        if has_migration_correlation and has_error_cluster:
            primary_hypothesis = {
                "cause": "Migration configuration mismatch",
                "confidence": 0.75,
                "reasoning": "Errors are clustered by migration stage and affect multiple merchants",
                "evidence": [
                    f"Multiple merchants ({affected_merchants_total}) affected",
                    f"Errors correlated with migration stages",
                    f"Error codes: {', '.join(error_codes[:3])}"
                ]
            }
            alternatives = [
                {
                    "cause": "Documentation gap in migration guide",
                    "confidence": 0.15,
                    "reasoning": "Merchants may have followed outdated docs"
                },
                {
                    "cause": "Platform regression in recent release",
                    "confidence": 0.10,
                    "reasoning": "Could be a new bug introduced"
                }
            ]
        elif has_error_cluster:
            # Analyze specific error codes
            primary_error = error_codes[0] if error_codes else "UNKNOWN"
            
            if "WEBHOOK" in primary_error:
                primary_hypothesis = {
                    "cause": "Webhook endpoint misconfiguration",
                    "confidence": 0.70,
                    "reasoning": "Webhook-related errors affecting multiple merchants",
                    "evidence": [
                        f"{affected_merchants_total} merchants reporting webhook issues",
                        "Common pattern: endpoint deprecation or URL validation"
                    ]
                }
            elif "PAYMENT" in primary_error or "CHECKOUT" in primary_error:
                primary_hypothesis = {
                    "cause": "Checkout/Payment flow breaking change",
                    "confidence": 0.72,
                    "reasoning": "Revenue-critical checkout errors detected",
                    "evidence": [
                        f"Checkout failures across {affected_merchants_total} merchants",
                        "High severity due to payment impact"
                    ]
                }
            elif "AUTH" in primary_error:
                primary_hypothesis = {
                    "cause": "API authentication version mismatch",
                    "confidence": 0.68,
                    "reasoning": "Auth tokens incompatible with new API version",
                    "evidence": [
                        f"Auth failures across {affected_merchants_total} merchants",
                        "Likely related to API v2 → v3 migration"
                    ]
                }
            else:
                primary_hypothesis = {
                    "cause": "API compatibility issue",
                    "confidence": 0.60,
                    "reasoning": "Multiple merchants experiencing same error",
                    "evidence": [
                        f"Error code: {primary_error}",
                        f"{affected_merchants_total} merchants affected"
                    ]
                }
            
            alternatives = [
                {
                    "cause": "Merchant-side implementation error",
                    "confidence": 0.20,
                    "reasoning": "Could be common coding mistake"
                },
                {
                    "cause": "Rate limiting or capacity issue",
                    "confidence": 0.10,
                    "reasoning": "Could be infrastructure constraint"
                }
            ]
        else:
            # Fallback for other patterns
            primary_hypothesis = {
                "cause": "Requires manual investigation",
                "confidence": 0.40,
                "reasoning": "Patterns detected but no clear root cause identified",
                "evidence": [
                    f"{len(patterns)} patterns detected",
                    "Insufficient correlation for automated diagnosis"
                ]
            }
            alternatives = []
        
        # Identify unknowns
        unknowns = []
        if not has_migration_correlation:
            unknowns.append("Migration stage not tracked for all events")
        if severity_breakdown.get("critical", 0) == 0:
            unknowns.append("No critical (5xx) errors - may be client-side issues")
        unknowns.append("Merchant implementation details not available")
        unknowns.append("Recent platform changes/deployments not provided")
        
        return {
            "primary_hypothesis": primary_hypothesis,
            "alternative_hypotheses": alternatives,
            "unknowns": unknowns,
            "analysis_method": "heuristic",
            "patterns_analyzed": len(patterns)
        }
    
    def _reason_with_llm(self, observation: Dict, context: Dict = None) -> Dict:
        """
        Use LLM for sophisticated reasoning with structured output.
        """
        try:
            # Lazy initialize client
            client = self._get_llm_client()
            if not client or not client.client:
                raise RuntimeError("LLM client not available")
            
            # Build comprehensive prompt
            prompt = self._build_reasoning_prompt(observation, context)
            
            # System instruction for structured output - MINIMAL
            system_instruction = """You analyze incidents. Output valid JSON only.

Example output:
{"primary_hypothesis":{"cause":"Config error","confidence":0.8,"reasoning":"Multiple merchants affected","evidence":["Error A","Error B"]},"alternative_hypotheses":[{"cause":"Network issue","confidence":0.15,"reasoning":"Possible timeout"}],"unknowns":["Missing logs"],"analysis_method":"llm"}"""
            
            # Call LLM with schema validation
            result = client.generate(
                prompt=prompt,
                system_instruction=system_instruction,
                response_schema=ReasoningOutputSchema,
                temperature=0.1,  # Low temperature for consistency
                max_output_tokens=1500
            )
            
            # Add metadata
            result["patterns_analyzed"] = len(observation.get("patterns", []))
            
            return result
            
        except Exception as e:
            print(f"⚠️  LLM reasoning failed: {e}. Falling back to heuristics.")
            return self._reason_with_heuristics(observation, context)
    
    def _build_reasoning_prompt(self, observation: Dict, context: Dict = None) -> str:
        """Build comprehensive prompt for LLM reasoning."""
        
        patterns = observation.get("patterns", [])
        severity = observation.get("severity_breakdown", {})
        summary = observation.get("summary", "")
        
        # Extract key info from patterns - SIMPLIFIED
        error_codes = []
        affected_merchants = 0
        for p in patterns:
            if p.get("pattern_type") == "error_cluster":
                error_codes.append(p.get("error_code"))
                affected_merchants += p.get("affected_merchants", 0)
        
        migration_stage = "unknown"
        for p in patterns:
            if p.get("pattern_type") == "migration_correlation":
                migration_stage = p.get("migration_stage", "unknown")
                break

        # RAG: Inject relevant docs to ground LLM response
        grounding = ""
        if RETRIEVAL_AVAILABLE:
            grounding = get_grounding_context(observation)
            if grounding:
                grounding = f"\n\n{grounding}\n"

        prompt = f"""Analyze this incident:

Summary: {summary}
Error codes: {', '.join(error_codes) if error_codes else 'None'}
Affected merchants: {affected_merchants}
Migration stage: {migration_stage}
Severity: {severity.get('critical', 0)} critical, {severity.get('high', 0)} high, {severity.get('medium', 0)} medium{grounding}

Cite relevant documentation when applicable. Generate root cause hypotheses in JSON format."""

        return prompt