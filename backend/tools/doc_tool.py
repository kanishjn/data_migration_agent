"""
Documentation Tool - Simulated documentation update interface.

This tool allows the agent to propose documentation updates based on
detected issues and patterns. It does NOT make any real changes.

All proposals are logged for human review and approval.
"""

from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional
import uuid

import sys
sys.path.append(str(Path(__file__).parent.parent))

from utils.logger import log_tool_action, tool_logger


class DocType(str, Enum):
    """Types of documentation."""
    API_REFERENCE = "api_reference"
    MIGRATION_GUIDE = "migration_guide"
    TROUBLESHOOTING = "troubleshooting"
    FAQ = "faq"
    CHANGELOG = "changelog"
    RUNBOOK = "runbook"


class ProposalStatus(str, Enum):
    """Status of a documentation proposal."""
    DRAFT = "draft"
    PENDING_REVIEW = "pending_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    PUBLISHED = "published"


class DocTool:
    """
    Simulated documentation update interface.
    
    Capabilities:
    - Propose new documentation sections
    - Suggest updates to existing docs
    - Create troubleshooting entries
    - Generate FAQ entries from patterns
    
    Limitations:
    - No real documentation system integration
    - All proposals are stored in-memory only
    - Requires human approval before any real changes
    - For demonstration and agent training purposes only
    """
    
    def __init__(self):
        # In-memory storage of documentation proposals
        self._proposals: list[dict] = []
        tool_logger.info("DocTool initialized (simulation mode)")
    
    def propose_doc_update(
        self,
        doc_type: DocType,
        title: str,
        content: str,
        target_path: Optional[str] = None,
        related_issues: Optional[list[str]] = None,
        reason: str = ""
    ) -> dict:
        """
        Propose a documentation update.
        
        NOTE: This is a PROPOSAL only. No documentation is actually changed.
        A human must review and approve the proposal.
        
        Args:
            doc_type: Type of documentation
            title: Title of the proposed section/update
            content: Proposed content (Markdown supported)
            target_path: Suggested file path for the update
            related_issues: Issue IDs that prompted this proposal
            reason: Explanation of why this update is needed
            
        Returns:
            Proposal record with unique ID
        """
        proposal_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
        
        proposal = {
            "proposal_id": proposal_id,
            "doc_type": doc_type,
            "title": title,
            "content": content,
            "target_path": target_path or self._suggest_path(doc_type, title),
            "related_issues": related_issues or [],
            "reason": reason,
            "status": ProposalStatus.PENDING_REVIEW,
            "created_at": datetime.utcnow().isoformat(),
            "created_by": "agent",
            "reviewed_by": None,
            "reviewed_at": None,
            "simulated": True
        }
        
        self._proposals.append(proposal)
        
        log_tool_action("doc_tool", "propose_update", {
            "proposal_id": proposal_id,
            "doc_type": doc_type,
            "title": title,
            "content_length": len(content),
            "note": "PROPOSAL - Requires human review before any changes"
        })
        
        return {
            "success": True,
            "proposal_id": proposal_id,
            "status": ProposalStatus.PENDING_REVIEW,
            "message": "Documentation update proposed. Awaiting human review.",
            "data": proposal
        }
    
    def _suggest_path(self, doc_type: DocType, title: str) -> str:
        """Generate a suggested file path based on doc type."""
        slug = title.lower().replace(" ", "-")[:50]
        
        paths = {
            DocType.API_REFERENCE: f"docs/api/{slug}.md",
            DocType.MIGRATION_GUIDE: f"docs/migration/{slug}.md",
            DocType.TROUBLESHOOTING: f"docs/troubleshooting/{slug}.md",
            DocType.FAQ: f"docs/faq/{slug}.md",
            DocType.CHANGELOG: "docs/CHANGELOG.md",
            DocType.RUNBOOK: f"docs/runbooks/{slug}.md",
        }
        
        return paths.get(doc_type, f"docs/{slug}.md")
    
    def propose_troubleshooting_entry(
        self,
        problem: str,
        symptoms: list[str],
        solution: str,
        related_error_codes: Optional[list[str]] = None,
        related_tickets: Optional[list[str]] = None
    ) -> dict:
        """
        Propose a new troubleshooting entry.
        
        Convenience method for creating troubleshooting documentation
        based on detected patterns.
        
        Args:
            problem: Brief problem description
            symptoms: List of symptoms/indicators
            solution: Proposed solution steps
            related_error_codes: Associated error codes
            related_tickets: Support tickets that showed this pattern
            
        Returns:
            Proposal record
        """
        content = f"""## {problem}

### Symptoms
{chr(10).join(f"- {s}" for s in symptoms)}

### Related Error Codes
{chr(10).join(f"- `{code}`" for code in (related_error_codes or ["N/A"]))}

### Solution
{solution}

### Related Support Tickets
{chr(10).join(f"- {tid}" for tid in (related_tickets or ["None documented"]))}

---
*This troubleshooting entry was auto-generated by the Migration Agent based on detected patterns.*
"""
        
        return self.propose_doc_update(
            doc_type=DocType.TROUBLESHOOTING,
            title=problem,
            content=content,
            related_issues=related_tickets,
            reason=f"Pattern detected across {len(related_tickets or [])} support tickets"
        )
    
    def propose_faq_entry(
        self,
        question: str,
        answer: str,
        category: str = "migration",
        related_tickets: Optional[list[str]] = None
    ) -> dict:
        """
        Propose a new FAQ entry.
        
        Args:
            question: The FAQ question
            answer: The answer content
            category: FAQ category
            related_tickets: Tickets that asked this question
            
        Returns:
            Proposal record
        """
        content = f"""### Q: {question}

**Category:** {category}

**A:** {answer}

---
*This FAQ was proposed based on recurring merchant questions.*
"""
        
        return self.propose_doc_update(
            doc_type=DocType.FAQ,
            title=question,
            content=content,
            related_issues=related_tickets,
            reason=f"Frequently asked by merchants ({len(related_tickets or [])} instances)"
        )
    
    def get_proposals(
        self,
        status: Optional[ProposalStatus] = None,
        doc_type: Optional[DocType] = None
    ) -> list[dict]:
        """
        Get documentation proposals with optional filters.
        
        Args:
            status: Filter by proposal status
            doc_type: Filter by documentation type
            
        Returns:
            List of matching proposals
        """
        results = self._proposals
        
        if status:
            results = [p for p in results if p.get("status") == status]
        
        if doc_type:
            results = [p for p in results if p.get("doc_type") == doc_type]
        
        return results
    
    def get_proposal(self, proposal_id: str) -> Optional[dict]:
        """
        Get a specific proposal by ID.
        
        Args:
            proposal_id: The proposal identifier
            
        Returns:
            Proposal dict or None if not found
        """
        for proposal in self._proposals:
            if proposal.get("proposal_id") == proposal_id:
                return proposal
        return None
    
    def update_proposal_status(
        self,
        proposal_id: str,
        new_status: ProposalStatus,
        reviewer: str,
        feedback: Optional[str] = None
    ) -> dict:
        """
        Update a proposal's status (simulated review workflow).
        
        NOTE: This is a SIMULATION of the review process.
        
        Args:
            proposal_id: The proposal to update
            new_status: New status value
            reviewer: Who reviewed the proposal
            feedback: Optional reviewer feedback
            
        Returns:
            Updated proposal or error
        """
        for proposal in self._proposals:
            if proposal.get("proposal_id") == proposal_id:
                proposal["status"] = new_status
                proposal["reviewed_by"] = reviewer
                proposal["reviewed_at"] = datetime.utcnow().isoformat()
                if feedback:
                    proposal["feedback"] = feedback
                
                log_tool_action("doc_tool", "update_proposal_status", {
                    "proposal_id": proposal_id,
                    "new_status": new_status,
                    "reviewer": reviewer,
                    "note": "SIMULATED - Review status updated"
                })
                
                return {
                    "success": True,
                    "proposal_id": proposal_id,
                    "status": new_status,
                    "message": f"Proposal {new_status.value}"
                }
        
        return {
            "success": False,
            "error": f"Proposal {proposal_id} not found"
        }


# Singleton instance for use by agent modules
doc_tool = DocTool()
