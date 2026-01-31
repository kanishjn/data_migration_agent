"""
Escalation Tool - Simulated escalation interface.

This tool simulates creating Jira tickets, sending Slack alerts,
and email notifications. It does NOT connect to any real systems.

All escalation actions are logged for audit and demonstration.
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional
import uuid

import sys
sys.path.append(str(Path(__file__).parent.parent))

from utils.logger import log_tool_action, tool_logger


class EscalationChannel(str, Enum):
    """Available escalation channels."""
    JIRA = "jira"
    SLACK = "slack"
    EMAIL = "email"
    PAGERDUTY = "pagerduty"


class EscalationPriority(str, Enum):
    """Escalation priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationTool:
    """
    Simulated escalation interface.
    
    Capabilities:
    - Create Jira tickets (simulated)
    - Send Slack alerts (simulated)
    - Send email notifications (simulated)
    - Trigger PagerDuty alerts (simulated)
    
    Limitations:
    - No real integrations with any external system
    - All actions are logged but not executed
    - For demonstration and agent training purposes only
    """
    
    def __init__(self):
        # In-memory log of simulated escalations
        self._escalation_log: list[dict] = []
        tool_logger.info("EscalationTool initialized (simulation mode)")
    
    def create_jira_ticket(
        self,
        title: str,
        description: str,
        priority: EscalationPriority = EscalationPriority.MEDIUM,
        labels: Optional[list[str]] = None,
        assignee: Optional[str] = None,
        related_ticket_ids: Optional[list[str]] = None
    ) -> dict:
        """
        Simulate creating a Jira ticket.
        
        NOTE: This is a SIMULATION. No real Jira ticket is created.
        
        Args:
            title: Ticket title/summary
            description: Detailed description
            priority: Ticket priority
            labels: Jira labels to apply
            assignee: Jira username to assign
            related_ticket_ids: Support ticket IDs to link
            
        Returns:
            Simulated Jira ticket response with fake ticket ID
        """
        fake_jira_id = f"MIG-{uuid.uuid4().hex[:6].upper()}"
        
        escalation = {
            "channel": EscalationChannel.JIRA,
            "jira_id": fake_jira_id,
            "title": title,
            "description": description[:500] + "..." if len(description) > 500 else description,
            "priority": priority,
            "labels": labels or [],
            "assignee": assignee,
            "related_tickets": related_ticket_ids or [],
            "created_at": datetime.utcnow().isoformat(),
            "simulated": True
        }
        
        self._escalation_log.append(escalation)
        
        log_tool_action("escalation_tool", "create_jira_ticket", {
            "jira_id": fake_jira_id,
            "title": title,
            "priority": priority,
            "note": "SIMULATED - No real Jira ticket created"
        })
        
        return {
            "success": True,
            "jira_id": fake_jira_id,
            "jira_url": f"https://jira.example.com/browse/{fake_jira_id}",
            "message": "SIMULATED: Jira ticket would be created with this data",
            "data": escalation
        }
    
    def send_slack_alert(
        self,
        channel: str,
        message: str,
        severity: EscalationPriority = EscalationPriority.MEDIUM,
        mention_users: Optional[list[str]] = None,
        thread_ts: Optional[str] = None
    ) -> dict:
        """
        Simulate sending a Slack alert.
        
        NOTE: This is a SIMULATION. No real Slack message is sent.
        
        Args:
            channel: Slack channel name (e.g., #migration-alerts)
            message: Alert message content
            severity: Alert severity for formatting
            mention_users: Slack usernames to @mention
            thread_ts: Thread timestamp for replies
            
        Returns:
            Simulated Slack response
        """
        fake_ts = f"{datetime.utcnow().timestamp()}"
        
        escalation = {
            "channel": EscalationChannel.SLACK,
            "slack_channel": channel,
            "message": message[:1000] if len(message) > 1000 else message,
            "severity": severity,
            "mentions": mention_users or [],
            "thread_ts": thread_ts,
            "message_ts": fake_ts,
            "created_at": datetime.utcnow().isoformat(),
            "simulated": True
        }
        
        self._escalation_log.append(escalation)
        
        log_tool_action("escalation_tool", "send_slack_alert", {
            "channel": channel,
            "severity": severity,
            "message_preview": message[:100],
            "note": "SIMULATED - No real Slack message sent"
        })
        
        return {
            "success": True,
            "message_ts": fake_ts,
            "channel": channel,
            "message": "SIMULATED: Slack alert would be sent with this data",
            "data": escalation
        }
    
    def send_email_notification(
        self,
        to: list[str],
        subject: str,
        body: str,
        cc: Optional[list[str]] = None,
        priority: EscalationPriority = EscalationPriority.MEDIUM
    ) -> dict:
        """
        Simulate sending an email notification.
        
        NOTE: This is a SIMULATION. No real email is sent.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject
            body: Email body content
            cc: CC recipients
            priority: Email priority flag
            
        Returns:
            Simulated email response
        """
        fake_message_id = f"<{uuid.uuid4().hex}@migration-agent.local>"
        
        escalation = {
            "channel": EscalationChannel.EMAIL,
            "message_id": fake_message_id,
            "to": to,
            "cc": cc or [],
            "subject": subject,
            "body_preview": body[:200] + "..." if len(body) > 200 else body,
            "priority": priority,
            "created_at": datetime.utcnow().isoformat(),
            "simulated": True
        }
        
        self._escalation_log.append(escalation)
        
        log_tool_action("escalation_tool", "send_email", {
            "to": to,
            "subject": subject,
            "priority": priority,
            "note": "SIMULATED - No real email sent"
        })
        
        return {
            "success": True,
            "message_id": fake_message_id,
            "message": "SIMULATED: Email would be sent with this data",
            "data": escalation
        }
    
    def trigger_pagerduty(
        self,
        service: str,
        title: str,
        details: dict,
        severity: EscalationPriority = EscalationPriority.HIGH
    ) -> dict:
        """
        Simulate triggering a PagerDuty alert.
        
        NOTE: This is a SIMULATION. No real PagerDuty alert is triggered.
        
        Args:
            service: PagerDuty service name
            title: Alert title
            details: Alert details dict
            severity: Alert severity
            
        Returns:
            Simulated PagerDuty response
        """
        fake_incident_id = f"PD-{uuid.uuid4().hex[:8].upper()}"
        
        escalation = {
            "channel": EscalationChannel.PAGERDUTY,
            "incident_id": fake_incident_id,
            "service": service,
            "title": title,
            "details": details,
            "severity": severity,
            "created_at": datetime.utcnow().isoformat(),
            "simulated": True
        }
        
        self._escalation_log.append(escalation)
        
        log_tool_action("escalation_tool", "trigger_pagerduty", {
            "incident_id": fake_incident_id,
            "service": service,
            "severity": severity,
            "note": "SIMULATED - No real PagerDuty alert triggered"
        })
        
        return {
            "success": True,
            "incident_id": fake_incident_id,
            "message": "SIMULATED: PagerDuty alert would be triggered with this data",
            "data": escalation
        }
    
    def get_escalation_log(self) -> list[dict]:
        """
        Get the log of all simulated escalations.
        
        Returns:
            List of all escalation actions taken (simulated)
        """
        return self._escalation_log.copy()
    
    def clear_escalation_log(self) -> None:
        """Clear the escalation log (for testing)."""
        self._escalation_log = []
        tool_logger.info("Escalation log cleared")


# Singleton instance for use by agent modules
escalation_tool = EscalationTool()
