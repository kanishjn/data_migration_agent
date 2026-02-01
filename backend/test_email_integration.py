"""
Test script for real email and PagerDuty integrations.

Run this to verify your SMTP and PagerDuty configuration.
"""

from tools.escalation_tool import EscalationTool, EscalationPriority

def test_email():
    """Test email sending."""
    print("\n" + "="*60)
    print("Testing Email Integration")
    print("="*60)
    
    tool = EscalationTool()
    
    if not tool.email_configured:
        print("⚠️ Email NOT configured. Configure SMTP_* variables in .env")
        print("   Current .env should have:")
        print("   - SMTP_HOST (e.g., smtp.gmail.com)")
        print("   - SMTP_PORT (e.g., 587)")
        print("   - SMTP_USERNAME")
        print("   - SMTP_PASSWORD")
        print("   - SMTP_FROM_EMAIL")
        return
    
    print("✅ Email is configured")
    print(f"   Host: {tool.smtp_host}:{tool.smtp_port}")
    print(f"   From: {tool.smtp_from_email}")
    
    # Test sending a real email
    print("\n📧 Attempting to send test email...")
    result = tool.send_email_notification(
        to=["accsecondary610@gmail.com"],  # Change this to your real email for testing
        subject="[TEST] Migration Agent Email Integration",
        body="""
Hello,

This is a test email from the Migration Agent's email integration.

If you receive this, the SMTP configuration is working correctly!

Severity: Medium
Timestamp: Now

---
Migration Agent
        """.strip(),
        priority=EscalationPriority.MEDIUM
    )
    
    if result["success"] and result.get("real"):
        print("✅ Email sent successfully!")
        print(f"   Message ID: {result['message_id']}")
    elif result["success"] and not result.get("real"):
        print("⚠️ Email was simulated (not actually sent)")
        print(f"   Reason: {result['message']}")
    else:
        print("❌ Email sending failed!")
        print(f"   Error: {result.get('error', 'Unknown error')}")


def test_pagerduty():
    """Test PagerDuty integration."""
    print("\n" + "="*60)
    print("Testing PagerDuty Integration")
    print("="*60)
    
    tool = EscalationTool()
    
    if not tool.pagerduty_configured:
        print("⚠️ PagerDuty NOT configured. Set PAGERDUTY_ROUTING_KEY in .env")
        print("   Get your routing key from:")
        print("   PagerDuty → Services → Your Service → Integrations → Events API V2")
        return
    
    print("✅ PagerDuty is configured")
    print(f"   Routing key: {tool.pagerduty_routing_key[:10]}...")
    
    # Test triggering a PagerDuty alert
    print("\n🚨 Attempting to trigger test PagerDuty alert...")
    result = tool.trigger_pagerduty(
        service="migration-service",
        title="[TEST] Migration Agent PagerDuty Integration",
        details={
            "test": True,
            "message": "This is a test alert from the Migration Agent",
            "timestamp": "now"
        },
        severity=EscalationPriority.MEDIUM
    )
    
    if result["success"] and result.get("real"):
        print("✅ PagerDuty alert triggered successfully!")
        print(f"   Dedup Key: {result['dedup_key']}")
        print("   Check your PagerDuty dashboard for the incident")
    elif result["success"] and not result.get("real"):
        print("⚠️ PagerDuty alert was simulated (not actually sent)")
        print(f"   Reason: {result['message']}")
    else:
        print("❌ PagerDuty alert failed!")
        print(f"   Error: {result.get('error', 'Unknown error')}")


def test_simulated():
    """Test simulated channels (Jira, Slack)."""
    print("\n" + "="*60)
    print("Testing Simulated Channels (Jira, Slack)")
    print("="*60)
    
    tool = EscalationTool()
    
    # Test Jira (always simulated)
    print("\n📋 Testing Jira ticket creation (SIMULATED)...")
    jira_result = tool.create_jira_ticket(
        title="[TEST] Sample Migration Issue",
        description="This is a test ticket from the agent",
        priority=EscalationPriority.MEDIUM
    )
    print(f"✅ Simulated Jira ticket: {jira_result['jira_id']}")
    print(f"   URL: {jira_result['jira_url']}")
    
    # Test Slack (always simulated)
    print("\n💬 Testing Slack alert (SIMULATED)...")
    slack_result = tool.send_slack_alert(
        channel="#migration-alerts",
        message="Test alert from Migration Agent",
        severity=EscalationPriority.MEDIUM
    )
    print(f"✅ Simulated Slack message: {slack_result['message_ts']}")
    print(f"   Channel: {slack_result['channel']}")


if __name__ == "__main__":
    print("\n🔧 Migration Agent - Integration Test Suite")
    print("=" * 60)
    
    # Test all channels
    test_simulated()
    test_email()
    test_pagerduty()
    
    print("\n" + "="*60)
    print("Test suite completed!")
    print("="*60)
    print("\n💡 To enable real integrations:")
    print("   1. Edit backend/.env with your SMTP credentials")
    print("   2. Edit backend/.env with your PagerDuty routing key")
    print("   3. Update the test email address in this script")
    print("   4. Run again to send real notifications")
    print()
