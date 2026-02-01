"""
ACTION LAYER (GUARDED)
Executes approved actions with safety checks.
Never auto-deploys or changes production config.
Uses LLM to draft human-readable messages and integrates with actual tools.
Stores all incidents and actions in persistent database.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime

# Import tools
try:
    from tools.llm_client import get_llm_client
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False

try:
    from tools.ticket_tool import TicketTool
    from tools.escalation_tool import EscalationTool, EscalationPriority, EscalationChannel
    from tools.doc_tool import DocTool, DocType
    from tools.log_tool import LogTool
    TOOLS_AVAILABLE = True
except ImportError:
    TOOLS_AVAILABLE = False

try:
    from memory.memory_manager import MemoryManager
    MEMORY_AVAILABLE = True
except ImportError:
    MEMORY_AVAILABLE = False


class ActionAgent:
    """
    Executes actions with safety guardrails using actual platform tools.
    
    CAN do automatically:
    - Draft messages/tickets (using LLM)
    - Create Jira tickets (simulated via EscalationTool)
    - Send Slack/email alerts (simulated via EscalationTool)
    - Update documentation proposals (simulated via DocTool)
    - Query logs for investigation (via LogTool)
    
    CANNOT do automatically:
    - Deploy code
    - Change production config
    - Disable merchant features
    - Modify checkout flow
    
    All actions include audit trail.
    """
    
    def __init__(self, dry_run: bool = True, use_llm: bool = False, db_path: Optional[str] = None):
        self.dry_run = dry_run
        self.use_llm = use_llm and LLM_AVAILABLE
        self.llm_client = None  # Lazy initialize
        self.executed_actions = []
        self.current_incident_id = None  # Track current incident being handled
        
        # Initialize memory manager
        if MEMORY_AVAILABLE:
            self.memory = MemoryManager(db_path=db_path)
        else:
            self.memory = None
            print("⚠️  MemoryManager not available. Incident data will not be persisted.")
        
        # Initialize tools
        if TOOLS_AVAILABLE:
            self.ticket_tool = TicketTool()
            self.escalation_tool = EscalationTool()
            self.doc_tool = DocTool()
            self.log_tool = LogTool()
        else:
            self.ticket_tool = None
            self.escalation_tool = None
            self.doc_tool = None
            self.log_tool = None
            print("⚠️  Tools not available. Action execution will be limited.")
        
        if use_llm and not LLM_AVAILABLE:
            print("⚠️  LLM requested but not available. Using template-based messages.")
    
    def _get_llm_client(self):
        """Lazy initialize LLM client."""
        if self.llm_client is None and LLM_AVAILABLE:
            self.llm_client = get_llm_client()
        return self.llm_client
    
    def act(self, decision: Dict[str, Any], approved: bool = False, 
            observation: Optional[Dict[str, Any]] = None, 
            reasoning: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Execute approved actions with safety checks and store incident data.
        
        Args:
            decision: Output from DecisionAgent
            approved: Whether human has approved (for high-risk actions)
            observation: Optional observation data for incident recording
            reasoning: Optional reasoning data for incident recording
        
        Returns:
            Execution results with status for each action
        """
        actions = decision.get("recommended_actions", [])
        requires_approval = decision.get("requires_human_approval", False)
        
        # Safety check: block high-risk actions without approval
        if requires_approval and not approved:
            return {
                "status": "pending_approval",
                "message": "Actions require human approval before execution",
                "approval_required": True,
                "actions_pending": actions,
                "risk_level": decision.get("risk_level"),
                "approval_url": self._generate_approval_url(decision)
            }
        
        # Store incident in database before execution
        if self.memory and reasoning:
            signal_cluster = self._build_signal_cluster_description(observation)
            primary = reasoning.get("primary_hypothesis", {})
            root_cause = primary.get("hypothesis") or primary.get("cause", "Unknown")
            confidence = primary.get("confidence", 0.0)
            
            # Record incident (outcome will be updated after execution)
            self.current_incident_id = self.memory.record_incident(
                signal_cluster=signal_cluster,
                root_cause=root_cause,
                confidence=confidence,
                actions_taken=[],  # Will update after execution
                outcome="pending"
            )
            print(f"📝 Recorded incident #{self.current_incident_id} in database")
        
        # Execute each action
        results = []
        for action in actions:
            result = self._execute_action(action, approved)
            results.append(result)
            self.executed_actions.append({
                "action": action,
                "result": result,
                "timestamp": datetime.utcnow().isoformat(),
                "approved": approved
            })
        
        # Update incident with actions taken and outcome
        if self.memory and self.current_incident_id:
            outcome = "completed" if all(r.get("success", False) for r in results) else "partial_failure"
            if not approved and requires_approval:
                outcome = "pending_approval"
            
            # Re-record with full action details
            signal_cluster = self._build_signal_cluster_description(observation)
            primary = reasoning.get("primary_hypothesis", {}) if reasoning else {}
            root_cause = primary.get("hypothesis") or primary.get("cause", "Unknown")
            confidence = primary.get("confidence", 0.0)
            
            # Create new record with complete data
            self.current_incident_id = self.memory.record_incident(
                signal_cluster=signal_cluster,
                root_cause=root_cause,
                confidence=confidence,
                actions_taken=results,
                outcome=outcome
            )
            print(f"✅ Updated incident #{self.current_incident_id} with execution results")
        
        return {
            "status": "completed" if all(r.get("success", False) for r in results) else "partial",
            "executed_actions": results,
            "incident_id": self.current_incident_id,
            "execution_mode": "dry_run" if self.dry_run else "live",
            "audit_trail": self._generate_audit_trail(results)
        }
    
    def _execute_action(self, action: Dict, approved: bool) -> Dict:
        """Execute a single action with guardrails."""
        action_type = action.get("type")
        
        # Route to appropriate handler
        handlers = {
            "engineering_escalation": self._escalate_to_engineering,
            "proactive_merchant_communication": self._send_merchant_communication,
            "support_ticket_creation": self._create_support_ticket,
            "investigate_logs": self._investigate_logs,
            "knowledge_base_update": self._update_knowledge_base,
            "docs_update_suggestion": self._suggest_docs_update,
            "internal_alert": self._send_internal_alert,
            "slack_alert": self._send_slack_alert,
            "email_notification": self._send_email_notification,
            "human_review_request": self._request_human_review,
            "incident_report_draft": self._draft_incident_report,
            "manual_review": self._queue_manual_review,
            "create_troubleshooting_entry": self._create_troubleshooting_entry,
            "update_runbook": self._update_runbook
        }
        
        handler = handlers.get(action_type, self._unsupported_action)
        
        try:
            return handler(action, approved)
        except Exception as e:
            return {
                "action_type": action_type,
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    # ==================== ESCALATION ACTIONS ====================
    
    def _escalate_to_engineering(self, action: Dict, approved: bool) -> Dict:
        """Create high-priority engineering escalation via EscalationTool."""
        details = action.get("details", {})
        priority_str = action.get("priority", "P1")
        
        if not self.escalation_tool:
            return {
                "action_type": "engineering_escalation",
                "success": False,
                "error": "EscalationTool not available"
            }
        
        # Map priority to enum
        priority_map = {
            "P0": EscalationPriority.CRITICAL,
            "P1": EscalationPriority.HIGH,
            "P2": EscalationPriority.MEDIUM,
            "P3": EscalationPriority.LOW
        }
        priority = priority_map.get(priority_str, EscalationPriority.HIGH)
        
        # Generate description using LLM if available
        description = self._generate_escalation_description(action, details)
        
        # Create Jira ticket
        jira_result = self.escalation_tool.create_jira_ticket(
            title=f"[{priority_str}] {action.get('reason', 'Migration Issue Detected')}",
            description=description,
            priority=priority,
            labels=["migration", "automated-detection", "agent-created"],
            related_ticket_ids=details.get("related_tickets", [])
        )
        
        # Send Slack alert for P0/P1
        slack_result = None
        if priority_str in ["P0", "P1"]:
            slack_result = self.escalation_tool.send_slack_alert(
                channel="#incidents" if priority_str == "P0" else "#platform-alerts",
                message=f"🚨 *{priority_str} Escalation*: {action.get('reason')}\n"
                       f"Affected merchants: {details.get('affected_merchants', 'Unknown')}\n"
                       f"Jira: {jira_result.get('jira_id')}",
                severity=priority
            )
        
        return {
            "action_type": "engineering_escalation",
            "success": True,
            "jira_ticket": jira_result,
            "slack_alert": slack_result,
            "priority": priority_str,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _generate_escalation_description(self, action: Dict, details: Dict) -> str:
        """Generate Jira ticket description using LLM or template."""
        if self.use_llm:
            try:
                client = self._get_llm_client()
                if client and client.client:
                    prompt = f"""Write a Jira ticket description for this issue:

Issue: {action.get('reason')}
Root cause: {details.get('root_cause', 'Under investigation')}
Confidence: {details.get('confidence', 'N/A')}
Affected merchants: {details.get('affected_merchants', 'Unknown')}

Include: Summary, Impact, Investigation steps, Related info.
Keep it under 300 words. Format with headers."""
                    
                    response = client._call_provider(prompt, "You write clear Jira tickets.", max_output_tokens=500)
                    return response
            except Exception:
                pass  # Fall back to template
        
        # Template fallback
        return f"""## Summary
{action.get('reason', 'Migration issue detected by automated agent')}

## Root Cause
{details.get('root_cause', 'Under investigation')}

## Impact
- Affected merchants: {details.get('affected_merchants', 'Unknown')}
- Confidence: {details.get('confidence', 'N/A')}

## Detection Method
Automated agent detection at {datetime.utcnow().isoformat()}

## Next Steps
1. Investigate root cause
2. Assess blast radius
3. Implement fix or rollback
4. Communicate to affected merchants"""
    
    def _send_slack_alert(self, action: Dict, approved: bool) -> Dict:
        """Send Slack alert via EscalationTool."""
        if not self.escalation_tool:
            return {"action_type": "slack_alert", "success": False, "error": "EscalationTool not available"}
        
        result = self.escalation_tool.send_slack_alert(
            channel=action.get("channel", "#platform-alerts"),
            message=action.get("message", action.get("reason", "Alert from agent")),
            severity=EscalationPriority.MEDIUM
        )
        
        return {
            "action_type": "slack_alert",
            "success": True,
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _send_email_notification(self, action: Dict, approved: bool) -> Dict:
        """Send email notification via EscalationTool."""
        if not self.escalation_tool:
            return {"action_type": "email_notification", "success": False, "error": "EscalationTool not available"}
        
        result = self.escalation_tool.send_email_notification(
            to=action.get("recipients", ["jainkanish412@gmail.com"]),
            subject=action.get("subject", "Platform Alert"),
            body=action.get("body", action.get("reason", "Issue detected"))
        )
        
        return {
            "action_type": "email_notification",
            "success": True,
            "result": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _send_internal_alert(self, action: Dict, approved: bool) -> Dict:
        """Send alert to internal team (Slack)."""
        return self._send_slack_alert(action, approved)
    
    # ==================== TICKET ACTIONS ====================
    
    def _create_support_ticket(self, action: Dict, approved: bool) -> Dict:
        """Create internal support ticket via TicketTool."""
        if not self.ticket_tool:
            return {"action_type": "support_ticket_creation", "success": False, "error": "TicketTool not available"}
        
        details = action.get("details", {})
        
        # Note: TicketTool is read-only for simulation, but we can query related tickets
        related_tickets = self.ticket_tool.list_tickets(
            merchant_id=details.get("merchant_id"),
            status="open"
        )
        
        return {
            "action_type": "support_ticket_creation",
            "success": True,
            "dry_run": self.dry_run,
            "related_open_tickets": len(related_tickets),
            "would_create": {
                "priority": action.get("priority", "P2"),
                "title": action.get("reason"),
                "details": details
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # ==================== INVESTIGATION ACTIONS ====================
    
    def _investigate_logs(self, action: Dict, approved: bool) -> Dict:
        """Query logs for deeper investigation via LogTool."""
        if not self.log_tool:
            return {"action_type": "investigate_logs", "success": False, "error": "LogTool not available"}
        
        details = action.get("details", {})
        
        # Query API errors
        api_errors = self.log_tool.get_api_errors(
            merchant_id=details.get("merchant_id"),
            error_code=details.get("error_code"),
            endpoint=details.get("endpoint")
        )
        
        # Query webhook failures
        webhook_failures = self.log_tool.get_webhook_failures(
            merchant_id=details.get("merchant_id")
        )
        
        # Aggregate error codes locally
        error_codes = {}
        for err in api_errors:
            code = err.get("error_code", "UNKNOWN")
            error_codes[code] = error_codes.get(code, 0) + 1
        
        return {
            "action_type": "investigate_logs",
            "success": True,
            "findings": {
                "api_errors_found": len(api_errors),
                "webhook_failures_found": len(webhook_failures),
                "top_error_codes": list(error_codes.keys())[:5] if error_codes else [],
                "error_code_counts": error_codes,
                "sample_errors": api_errors[:3] if api_errors else []
            },
            "recommendation": "Further manual investigation recommended" if len(api_errors) > 10 else "Contained issue",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # ==================== DOCUMENTATION ACTIONS ====================
    
    def _suggest_docs_update(self, action: Dict, approved: bool) -> Dict:
        """Suggest documentation improvement via DocTool."""
        if not self.doc_tool:
            return {"action_type": "docs_update_suggestion", "success": False, "error": "DocTool not available"}
        
        details = action.get("details", {})
        
        # Generate content using LLM if available
        content = self._generate_doc_content(action, details)
        
        proposal = self.doc_tool.propose_doc_update(
            doc_type=DocType.TROUBLESHOOTING,
            title=f"Troubleshooting: {details.get('issue', 'Migration Issue')}",
            content=content,
            related_issues=details.get("related_issues", []),
            reason=action.get("reason", "Agent-detected recurring issue")
        )
        
        return {
            "action_type": "docs_update_suggestion",
            "success": True,
            "proposal": proposal,
            "status": "pending_review",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _create_troubleshooting_entry(self, action: Dict, approved: bool) -> Dict:
        """Create a troubleshooting guide entry."""
        if not self.doc_tool:
            return {"action_type": "create_troubleshooting_entry", "success": False, "error": "DocTool not available"}
        
        details = action.get("details", {})
        
        proposal = self.doc_tool.propose_troubleshooting_entry(
            problem=details.get("problem", details.get("error_code", "Unknown Issue")),
            symptoms=details.get("symptoms", ["Error occurring"]),
            solution=details.get("solution", "Contact support"),
            related_error_codes=details.get("error_codes", [details.get("error_code")]),
            related_tickets=details.get("related_tickets", [])
        )
        
        return {
            "action_type": "create_troubleshooting_entry",
            "success": True,
            "entry": proposal,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _update_runbook(self, action: Dict, approved: bool) -> Dict:
        """Update operational runbook."""
        if not self.doc_tool:
            return {"action_type": "update_runbook", "success": False, "error": "DocTool not available"}
        
        details = action.get("details", {})
        
        proposal = self.doc_tool.propose_doc_update(
            doc_type=DocType.RUNBOOK,
            title=f"Runbook: {details.get('scenario', 'Migration Issue Response')}",
            content=self._generate_runbook_content(details),
            reason="Agent-generated from incident pattern"
        )
        
        return {
            "action_type": "update_runbook",
            "success": True,
            "proposal": proposal,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _update_knowledge_base(self, action: Dict, approved: bool) -> Dict:
        """Add entry to internal knowledge base."""
        return self._suggest_docs_update(action, approved)
    
    def _generate_doc_content(self, action: Dict, details: Dict) -> str:
        """Generate documentation content using LLM or template."""
        if self.use_llm:
            try:
                client = self._get_llm_client()
                if client and client.client:
                    prompt = f"""Write a troubleshooting documentation entry:

Issue: {action.get('reason', 'Unknown issue')}
Error code: {details.get('error_code', 'N/A')}
Root cause: {details.get('root_cause', 'Under investigation')}

Format with: ## Problem, ## Symptoms, ## Cause, ## Solution, ## Prevention"""
                    
                    response = client._call_provider(prompt, "You write technical documentation.", max_output_tokens=500)
                    return response
            except Exception:
                pass
        
        # Template fallback
        return f"""## Problem
{action.get('reason', 'Migration-related issue')}

## Symptoms
- Error code: {details.get('error_code', 'See logs')}
- Affected area: Migration/checkout

## Cause
{details.get('root_cause', 'Configuration mismatch during migration')}

## Solution
1. Verify migration configuration
2. Check API version compatibility  
3. Contact support if issue persists

## Prevention
- Follow migration checklist
- Test in staging before production
"""
    
    def _generate_runbook_content(self, details: Dict) -> str:
        """Generate runbook content."""
        return f"""## Runbook: {details.get('scenario', 'Issue Response')}

### Trigger
This runbook should be followed when: {details.get('trigger', 'Issue detected')}

### Steps
1. Acknowledge the alert
2. Check dashboard for scope
3. Review error logs
4. Identify affected merchants
5. Determine if rollback needed
6. Communicate with stakeholders
7. Implement fix
8. Verify resolution
9. Update incident report

### Escalation
- P0: Page on-call immediately
- P1: Notify team within 15 minutes
- P2: Update ticket within 1 hour
"""
    
    # ==================== COMMUNICATION ACTIONS ====================
    
    def _send_merchant_communication(self, action: Dict, approved: bool) -> Dict:
        """Draft merchant communication (requires approval to send)."""
        details = action.get("details", {})
        merchant_count = details.get("merchant_count", 0)
        template = action.get("message_template", "general")
        
        # Generate draft message
        message = self._generate_merchant_message(template, details)
        
        # For merchant comms, always require approval (never auto-send)
        return {
            "action_type": "proactive_merchant_communication",
            "success": True,
            "draft_created": True,
            "requires_final_approval": True,  # Always require human to send
            "message_preview": message[:500] + "..." if len(message) > 500 else message,
            "full_message": message,
            "target_merchant_count": merchant_count,
            "send_via": action.get("channel", "email"),
            "status": "draft_ready",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _generate_merchant_message(self, template: str, details: Dict) -> str:
        """Generate merchant-facing message using LLM or templates."""
        if self.use_llm:
            try:
                return self._generate_message_with_llm(template, details)
            except Exception as e:
                print(f"⚠️  LLM message generation failed: {e}. Using template.")
        
        # Template fallback
        templates = {
            "checkout_issue_proactive": """Subject: Important: Action May Be Required for Your Checkout

Dear Merchant,

We've detected a potential issue that may be affecting your checkout process.

**Issue Detected:** {root_cause}

**What This Means:**
Some transactions may be experiencing errors. Our team is actively investigating.

**Recommended Action:**
{workaround}

**Timeline:**
We expect to have more information within the next 2 hours.

**Need Help?**
Contact our support team or check your dashboard for real-time status.

Thank you for your patience,
The Platform Team
""",
            "webhook_configuration_issue": """Subject: Action Required: Webhook Configuration Update

Dear Merchant,

Following your recent migration, your webhook endpoint configuration needs to be updated.

**Issue:** {root_cause}

**Action Required:**
1. Log into your dashboard
2. Navigate to Settings > Webhooks
3. Update your endpoint URL as per our migration guide

**Documentation:** https://docs.platform.com/webhooks/migration

If you need assistance, our support team is ready to help.

Best regards,
The Platform Team
""",
            "general_migration_issue": """Subject: Migration Update: Issue Detected

Dear Merchant,

We've identified a potential issue related to your recent platform migration.

**Details:** {root_cause}

**Status:** Our team is actively investigating this issue.

**Next Steps:**
We'll reach out with specific guidance once we have more information.

If you're experiencing immediate issues, please contact support.

Best regards,
The Platform Team
"""
        }
        
        template_str = templates.get(template, templates["general_migration_issue"])
        return template_str.format(
            root_cause=details.get("root_cause", "Technical issue under investigation"),
            workaround=details.get("workaround", "Please check your configuration settings")
        )
    
    def _generate_message_with_llm(self, template: str, details: Dict) -> str:
        """Generate merchant message using LLM."""
        client = self._get_llm_client()
        if not client or not client.client:
            raise RuntimeError("LLM client not available")
        
        prompt = f"""Write a professional email to merchants about a technical issue.

Template type: {template}
Root cause: {details.get('root_cause', 'Technical issue')}
Workaround available: {details.get('workaround_available', False)}
Affected merchants: {details.get('merchant_count', 'multiple')}

Requirements:
- Professional, empathetic tone
- Clear, non-technical explanation
- Specific action items if available
- Include subject line
- Under 200 words"""
        
        response = client._call_provider(
            prompt, 
            "You write professional B2B support emails. Be clear, empathetic, and actionable.",
            max_output_tokens=400
        )
        
        return response
    
    # ==================== REVIEW ACTIONS ====================
    
    def _request_human_review(self, action: Dict, approved: bool) -> Dict:
        """Queue for human analyst review."""
        return {
            "action_type": "human_review_request",
            "success": True,
            "queued": True,
            "reason": action.get("reason"),
            "priority": action.get("priority", "normal"),
            "review_url": self._generate_review_url(action),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _draft_incident_report(self, action: Dict, approved: bool) -> Dict:
        """Generate incident report draft."""
        details = action.get("details", {})
        
        # Generate report content
        report_content = self._generate_incident_report(details)
        
        return {
            "action_type": "incident_report_draft",
            "success": True,
            "report_id": f"INC-{datetime.utcnow().strftime('%Y%m%d')}-001",
            "report": report_content,
            "status": "draft",
            "requires_review": True,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _generate_incident_report(self, details: Dict) -> Dict:
        """Generate structured incident report."""
        return {
            "title": f"Incident Report: {details.get('root_cause', 'Migration Issue')}",
            "summary": details.get("summary", "Issue detected by automated monitoring"),
            "timeline": {
                "detected": datetime.utcnow().isoformat(),
                "acknowledged": None,
                "mitigated": None,
                "resolved": None
            },
            "impact": {
                "description": details.get("impact", {}).get("description", "Checkout issues"),
                "merchants_affected": details.get("impact", {}).get("merchants", "Unknown"),
                "severity": details.get("impact", {}).get("severity", "high")
            },
            "root_cause": {
                "summary": details.get("root_cause", "Under investigation"),
                "confidence": details.get("confidence", 0.0)
            },
            "actions_taken": [],
            "lessons_learned": [],
            "prevention_measures": [],
            "detection_method": "automated_agent"
        }
    
    def _queue_manual_review(self, action: Dict, approved: bool) -> Dict:
        """Queue item for manual review."""
        return self._request_human_review(action, approved)
    
    def _unsupported_action(self, action: Dict, approved: bool) -> Dict:
        """Handle unknown action types."""
        return {
            "action_type": action.get("type", "unknown"),
            "success": False,
            "error": f"Unsupported action type: {action.get('type')}",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    # ==================== UTILITIES ====================
    
    def _build_signal_cluster_description(self, observation: Optional[Dict[str, Any]]) -> str:
        """Build a concise description of the signal cluster for database storage."""
        if not observation:
            return "Unknown signal pattern"
        
        patterns = observation.get("patterns", [])
        severity_breakdown = observation.get("severity_breakdown", {})
        summary = observation.get("summary", "")
        
        # If patterns is a list, extract key info from first pattern
        if isinstance(patterns, list) and patterns:
            first_pattern = patterns[0]
            pattern_type = first_pattern.get("pattern_type", "unknown")
            severity = first_pattern.get("severity", "unknown")
            affected_merchants = first_pattern.get("affected_merchants", 0)
            
            # Try to get error code if available
            error_code = first_pattern.get("error_code", "")
            if not error_code and "top_errors" in first_pattern:
                top_errors = first_pattern["top_errors"]
                if top_errors:
                    error_code = top_errors[0].get("code", "")
            
            description = f"{pattern_type} | Severity: {severity}"
            if error_code:
                description += f" | Error: {error_code}"
            description += f" | Merchants: {affected_merchants}"
            
        else:
            # Fallback to summary
            description = summary if summary else "Pattern detected"
        
        return description
    
    def _generate_approval_url(self, decision: Dict) -> str:
        """Generate URL for human approval interface."""
        return "https://platform-admin.internal/agent-approvals/pending"
    
    def _generate_review_url(self, action: Dict) -> str:
        """Generate URL for human review queue."""
        return "https://platform-admin.internal/agent-reviews/queue"
    
    def _generate_audit_trail(self, results: List[Dict]) -> Dict:
        """Generate audit trail for compliance."""
        return {
            "total_actions": len(results),
            "successful": sum(1 for r in results if r.get("success")),
            "failed": sum(1 for r in results if not r.get("success")),
            "timestamp": datetime.utcnow().isoformat(),
            "execution_mode": "dry_run" if self.dry_run else "live",
            "actions_summary": [
                {
                    "type": r.get("action_type"),
                    "success": r.get("success"),
                    "error": r.get("error") if not r.get("success") else None
                }
                for r in results
            ]
        }
    
    def get_execution_history(self) -> List[Dict]:
        """Get history of all executed actions."""
        return self.executed_actions
    
    def get_tool_status(self) -> Dict[str, bool]:
        """Get status of available tools."""
        return {
            "ticket_tool": self.ticket_tool is not None,
            "escalation_tool": self.escalation_tool is not None,
            "doc_tool": self.doc_tool is not None,
            "log_tool": self.log_tool is not None,
            "llm_available": LLM_AVAILABLE and self.use_llm
        }
