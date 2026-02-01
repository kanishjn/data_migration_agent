"""
Escalation Tool - Mixed simulation and real integrations.

This tool:
- SIMULATES: Jira tickets, Slack alerts (for demo/testing)
- REAL: Email notifications (SMTP), PagerDuty alerts (Events API)

All escalation actions are logged for audit and demonstration.
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional
import uuid
import os
import smtplib
import requests
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

import sys
sys.path.append(str(Path(__file__).parent.parent))

from utils.logger import log_tool_action, tool_logger

# Load environment variables
load_dotenv()


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
    Mixed escalation interface (simulation + real integrations).
    
    Capabilities:
    - Create Jira tickets (SIMULATED - no real Jira integration)
    - Send Slack alerts (SIMULATED - no real Slack integration)
    - Send email notifications (REAL - uses SMTP)
    - Trigger PagerDuty alerts (REAL - uses Events API v2)
    
    Configuration:
    - Email: Requires SMTP_* environment variables
    - PagerDuty: Requires PAGERDUTY_ROUTING_KEY environment variable
    """
    
    def __init__(self):
        # In-memory log of all escalations (simulated and real)
        self._escalation_log: list[dict] = []
        
        # Load email configuration
        self.smtp_host = os.getenv("SMTP_HOST")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME")
        self.smtp_password = os.getenv("SMTP_PASSWORD")
        self.smtp_from_email = os.getenv("SMTP_FROM_EMAIL")
        self.smtp_from_name = os.getenv("SMTP_FROM_NAME", "Migration Agent")
        
        # Load PagerDuty configuration
        self.pagerduty_routing_key = os.getenv("PAGERDUTY_ROUTING_KEY")
        
        # Check which integrations are configured
        self.email_configured = all([
            self.smtp_host, self.smtp_username, 
            self.smtp_password, self.smtp_from_email
        ])
        self.pagerduty_configured = bool(self.pagerduty_routing_key)
        
        tool_logger.info(
            f"EscalationTool initialized - "
            f"Email: {'configured' if self.email_configured else 'NOT configured'}, "
            f"PagerDuty: {'configured' if self.pagerduty_configured else 'NOT configured'}"
        )
    
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
        priority: EscalationPriority = EscalationPriority.MEDIUM,
        html: bool = False
    ) -> dict:
        """
        Send a REAL email notification via SMTP.
        
        This actually sends emails! Requires SMTP configuration in .env.
        Falls back to simulation if email is not configured.
        
        Args:
            to: List of recipient email addresses
            subject: Email subject
            body: Email body content (plain text or HTML)
            cc: CC recipients
            priority: Email priority flag
            html: Whether body is HTML (default: plain text)
            
        Returns:
            Email send result
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
            "simulated": not self.email_configured
        }
        
        # Try to send real email if configured
        if self.email_configured:
            try:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = f"{self.smtp_from_name} <{self.smtp_from_email}>"
                msg['To'] = ', '.join(to)
                if cc:
                    msg['Cc'] = ', '.join(cc)
                
                # Set priority header
                if priority == EscalationPriority.CRITICAL:
                    msg['X-Priority'] = '1'
                    msg['Importance'] = 'high'
                elif priority == EscalationPriority.HIGH:
                    msg['X-Priority'] = '2'
                    msg['Importance'] = 'high'
                
                # Attach body
                mime_type = 'html' if html else 'plain'
                msg.attach(MIMEText(body, mime_type))
                
                # Send via SMTP
                with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                    server.starttls()
                    server.login(self.smtp_username, self.smtp_password)
                    recipients = to + (cc or [])
                    server.send_message(msg, self.smtp_from_email, recipients)
                
                escalation["simulated"] = False
                escalation["sent_successfully"] = True
                
                self._escalation_log.append(escalation)
                
                log_tool_action("escalation_tool", "send_email", {
                    "to": to,
                    "subject": subject,
                    "priority": priority,
                    "note": "REAL EMAIL SENT via SMTP"
                })
                
                tool_logger.info(f"✅ Real email sent to {to}: {subject}")
                
                return {
                    "success": True,
                    "message_id": fake_message_id,
                    "message": "Email sent successfully via SMTP",
                    "real": True,
                    "data": escalation
                }
                
            except Exception as e:
                tool_logger.error(f"Failed to send real email: {e}")
                escalation["error"] = str(e)
                escalation["sent_successfully"] = False
                self._escalation_log.append(escalation)
                
                return {
                    "success": False,
                    "error": str(e),
                    "message": f"Failed to send email: {e}",
                    "real": True,
                    "data": escalation
                }
        
        # Fallback to simulation if not configured
        self._escalation_log.append(escalation)
        
        log_tool_action("escalation_tool", "send_email", {
            "to": to,
            "subject": subject,
            "priority": priority,
            "note": "SIMULATED - Email not configured"
        })
        
        tool_logger.warning(f"⚠️ Email SIMULATED (not configured): {subject}")
        
        return {
            "success": True,
            "message_id": fake_message_id,
            "message": "SIMULATED: Email not configured. Set SMTP_* environment variables.",
            "real": False,
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
        Trigger a REAL PagerDuty alert via Events API v2.
        
        This actually creates PagerDuty incidents! Requires PAGERDUTY_ROUTING_KEY in .env.
        Falls back to simulation if PagerDuty is not configured.
        
        Args:
            service: PagerDuty service name (for logging)
            title: Alert title (event summary)
            details: Alert details dict (custom_details)
            severity: Alert severity (mapped to PagerDuty severity)
            
        Returns:
            PagerDuty trigger result
        """
        fake_incident_id = f"PD-{uuid.uuid4().hex[:8].upper()}"
        dedup_key = f"migration-agent-{uuid.uuid4().hex[:12]}"
        
        escalation = {
            "channel": EscalationChannel.PAGERDUTY,
            "incident_id": fake_incident_id,
            "dedup_key": dedup_key,
            "service": service,
            "title": title,
            "details": details,
            "severity": severity,
            "created_at": datetime.utcnow().isoformat(),
            "simulated": not self.pagerduty_configured
        }
        
        # Try to send real PagerDuty alert if configured
        if self.pagerduty_configured:
            try:
                # Map our severity to PagerDuty severity
                pd_severity_map = {
                    EscalationPriority.LOW: "info",
                    EscalationPriority.MEDIUM: "warning",
                    EscalationPriority.HIGH: "error",
                    EscalationPriority.CRITICAL: "critical"
                }
                
                payload = {
                    "routing_key": self.pagerduty_routing_key,
                    "event_action": "trigger",
                    "dedup_key": dedup_key,
                    "payload": {
                        "summary": title,
                        "severity": pd_severity_map.get(severity, "error"),
                        "source": "migration-agent",
                        "custom_details": details
                    }
                }
                
                response = requests.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=payload,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                
                response.raise_for_status()
                result = response.json()
                
                escalation["simulated"] = False
                escalation["sent_successfully"] = True
                escalation["pd_dedup_key"] = result.get("dedup_key", dedup_key)
                
                self._escalation_log.append(escalation)
                
                log_tool_action("escalation_tool", "trigger_pagerduty", {
                    "incident_id": fake_incident_id,
                    "service": service,
                    "severity": severity,
                    "dedup_key": dedup_key,
                    "note": "REAL PAGERDUTY ALERT SENT"
                })
                
                tool_logger.info(f"✅ Real PagerDuty alert triggered: {title}")
                
                return {
                    "success": True,
                    "incident_id": fake_incident_id,
                    "dedup_key": dedup_key,
                    "message": "PagerDuty alert triggered successfully",
                    "real": True,
                    "data": escalation
                }
                
            except Exception as e:
                tool_logger.error(f"Failed to trigger real PagerDuty alert: {e}")
                escalation["error"] = str(e)
                escalation["sent_successfully"] = False
                self._escalation_log.append(escalation)
                
                return {
                    "success": False,
                    "error": str(e),
                    "message": f"Failed to trigger PagerDuty alert: {e}",
                    "real": True,
                    "data": escalation
                }
        
        # Fallback to simulation if not configured
        self._escalation_log.append(escalation)
        
        log_tool_action("escalation_tool", "trigger_pagerduty", {
            "incident_id": fake_incident_id,
            "service": service,
            "severity": severity,
            "note": "SIMULATED - PagerDuty not configured"
        })
        
        tool_logger.warning(f"⚠️ PagerDuty SIMULATED (not configured): {title}")
        
        return {
            "success": True,
            "incident_id": fake_incident_id,
            "message": "SIMULATED: PagerDuty not configured. Set PAGERDUTY_ROUTING_KEY environment variable.",
            "real": False,
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
