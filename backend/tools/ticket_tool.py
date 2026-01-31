"""
Ticket Tool - Simulated support ticket interface.

This tool provides a simulation layer for support ticket operations.
It does NOT connect to any real ticketing system (Zendesk, Intercom, etc.).

All actions are logged for audit purposes and agent learning.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import sys
sys.path.append(str(Path(__file__).parent.parent))

from utils.logger import log_tool_action, tool_logger


# Path to simulated ticket data
SIMULATION_DATA_PATH = Path(__file__).parent.parent / "simulations" / "tickets.json"


class TicketTool:
    """
    Simulated support ticket interface.
    
    Capabilities:
    - Read ticket details
    - List tickets by merchant or status
    - Update ticket status (simulated)
    - Add internal notes (simulated)
    
    Limitations:
    - No real ticketing system integration
    - All updates are logged but not persisted to external systems
    - For demonstration and agent training purposes only
    """
    
    def __init__(self):
        self._tickets: list[dict] = []
        self._load_simulation_data()
        tool_logger.info("TicketTool initialized with simulation data")
    
    def _load_simulation_data(self) -> None:
        """Load simulated tickets from JSON file."""
        try:
            with open(SIMULATION_DATA_PATH, "r") as f:
                self._tickets = json.load(f)
            tool_logger.info(f"Loaded {len(self._tickets)} simulated tickets")
        except FileNotFoundError:
            tool_logger.warning(f"Simulation data not found at {SIMULATION_DATA_PATH}")
            self._tickets = []
        except json.JSONDecodeError as e:
            tool_logger.error(f"Failed to parse ticket simulation data: {e}")
            self._tickets = []
    
    def get_ticket(self, ticket_id: str) -> Optional[dict]:
        """
        Retrieve a ticket by ID.
        
        Args:
            ticket_id: The ticket identifier
            
        Returns:
            Ticket data dict or None if not found
        """
        log_tool_action("ticket_tool", "get_ticket", {"ticket_id": ticket_id})
        
        for ticket in self._tickets:
            if ticket.get("ticket_id") == ticket_id:
                return ticket
        
        tool_logger.warning(f"Ticket not found: {ticket_id}")
        return None
    
    def list_tickets(
        self,
        merchant_id: Optional[str] = None,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        tags: Optional[list[str]] = None
    ) -> list[dict]:
        """
        List tickets with optional filters.
        
        Args:
            merchant_id: Filter by merchant
            status: Filter by status (open, investigating, pending, resolved)
            severity: Filter by severity (low, medium, high, critical)
            tags: Filter by tags (any match)
            
        Returns:
            List of matching tickets
        """
        log_tool_action("ticket_tool", "list_tickets", {
            "merchant_id": merchant_id,
            "status": status,
            "severity": severity,
            "tags": tags
        })
        
        results = self._tickets
        
        if merchant_id:
            results = [t for t in results if t.get("merchant_id") == merchant_id]
        
        if status:
            results = [t for t in results if t.get("status") == status]
        
        if severity:
            results = [t for t in results if t.get("severity") == severity]
        
        if tags:
            results = [
                t for t in results 
                if any(tag in t.get("tags", []) for tag in tags)
            ]
        
        return results
    
    def update_ticket_status(
        self,
        ticket_id: str,
        new_status: str,
        reason: str
    ) -> dict:
        """
        Simulate updating a ticket's status.
        
        NOTE: This is a SIMULATION. No real ticket system is updated.
        The action is logged for audit and agent feedback.
        
        Args:
            ticket_id: The ticket to update
            new_status: New status value
            reason: Reason for the status change
            
        Returns:
            Log entry of the simulated action
        """
        return log_tool_action("ticket_tool", "update_status", {
            "ticket_id": ticket_id,
            "new_status": new_status,
            "reason": reason,
            "note": "SIMULATED - No real ticket system updated"
        })
    
    def add_internal_note(
        self,
        ticket_id: str,
        note: str,
        author: str = "agent"
    ) -> dict:
        """
        Simulate adding an internal note to a ticket.
        
        NOTE: This is a SIMULATION. No real ticket system is updated.
        
        Args:
            ticket_id: The ticket to annotate
            note: The note content
            author: Who is adding the note
            
        Returns:
            Log entry of the simulated action
        """
        return log_tool_action("ticket_tool", "add_internal_note", {
            "ticket_id": ticket_id,
            "note_preview": note[:100] + "..." if len(note) > 100 else note,
            "author": author,
            "note": "SIMULATED - No real ticket system updated"
        })
    
    def link_tickets(self, ticket_ids: list[str], relationship: str = "related") -> dict:
        """
        Simulate linking related tickets together.
        
        NOTE: This is a SIMULATION.
        
        Args:
            ticket_ids: List of ticket IDs to link
            relationship: Type of relationship (related, duplicate, parent-child)
            
        Returns:
            Log entry of the simulated action
        """
        return log_tool_action("ticket_tool", "link_tickets", {
            "ticket_ids": ticket_ids,
            "relationship": relationship,
            "note": "SIMULATED - No real ticket system updated"
        })


# Singleton instance for use by agent modules
ticket_tool = TicketTool()
