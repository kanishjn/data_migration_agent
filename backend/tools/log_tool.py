"""
Log Tool - Simulated log and error monitoring interface.

This tool provides access to simulated API errors, checkout failures,
and webhook logs. It does NOT connect to real monitoring systems
(Datadog, Splunk, CloudWatch, etc.).

All queries are logged for audit purposes.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import sys
sys.path.append(str(Path(__file__).parent.parent))

from utils.logger import log_tool_action, tool_logger


# Paths to simulated log data
API_ERRORS_PATH = Path(__file__).parent.parent / "simulations" / "api_errors.json"
WEBHOOK_FAILURES_PATH = Path(__file__).parent.parent / "simulations" / "webhook_failures.json"


class LogTool:
    """
    Simulated log and error monitoring interface.
    
    Capabilities:
    - Query API error logs
    - Query webhook failure logs  
    - Search by merchant, error code, time range
    - Aggregate error patterns
    
    Limitations:
    - No real monitoring system integration
    - Data is static simulation data
    - For demonstration and agent training purposes only
    """
    
    def __init__(self):
        self._api_errors: list[dict] = []
        self._webhook_failures: list[dict] = []
        self._load_simulation_data()
        tool_logger.info("LogTool initialized with simulation data")
    
    def _load_simulation_data(self) -> None:
        """Load simulated log data from JSON files."""
        # Load API errors
        try:
            with open(API_ERRORS_PATH, "r") as f:
                self._api_errors = json.load(f)
            tool_logger.info(f"Loaded {len(self._api_errors)} simulated API errors")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            tool_logger.warning(f"Failed to load API errors: {e}")
            self._api_errors = []
        
        # Load webhook failures
        try:
            with open(WEBHOOK_FAILURES_PATH, "r") as f:
                self._webhook_failures = json.load(f)
            tool_logger.info(f"Loaded {len(self._webhook_failures)} simulated webhook failures")
        except (FileNotFoundError, json.JSONDecodeError) as e:
            tool_logger.warning(f"Failed to load webhook failures: {e}")
            self._webhook_failures = []
    
    def get_api_errors(
        self,
        merchant_id: Optional[str] = None,
        error_code: Optional[str] = None,
        endpoint: Optional[str] = None,
        min_occurrences: int = 1
    ) -> list[dict]:
        """
        Query API error logs with filters.
        
        Args:
            merchant_id: Filter by merchant
            error_code: Filter by specific error code
            endpoint: Filter by API endpoint (partial match)
            min_occurrences: Minimum occurrence count
            
        Returns:
            List of matching API errors
        """
        log_tool_action("log_tool", "get_api_errors", {
            "merchant_id": merchant_id,
            "error_code": error_code,
            "endpoint": endpoint,
            "min_occurrences": min_occurrences
        })
        
        results = self._api_errors
        
        if merchant_id:
            results = [e for e in results if e.get("merchant_id") == merchant_id]
        
        if error_code:
            results = [e for e in results if e.get("error_code") == error_code]
        
        if endpoint:
            results = [e for e in results if endpoint in e.get("endpoint", "")]
        
        results = [e for e in results if e.get("occurrence_count", 0) >= min_occurrences]
        
        return results
    
    def get_webhook_failures(
        self,
        merchant_id: Optional[str] = None,
        event_type: Optional[str] = None,
        version_mismatch_only: bool = False
    ) -> list[dict]:
        """
        Query webhook failure logs with filters.
        
        Args:
            merchant_id: Filter by merchant
            event_type: Filter by webhook event type
            version_mismatch_only: Only return version mismatch failures
            
        Returns:
            List of matching webhook failures
        """
        log_tool_action("log_tool", "get_webhook_failures", {
            "merchant_id": merchant_id,
            "event_type": event_type,
            "version_mismatch_only": version_mismatch_only
        })
        
        results = self._webhook_failures
        
        if merchant_id:
            results = [f for f in results if f.get("merchant_id") == merchant_id]
        
        if event_type:
            results = [f for f in results if f.get("event_type") == event_type]
        
        if version_mismatch_only:
            results = [
                f for f in results 
                if f.get("expected_version") != f.get("actual_version")
            ]
        
        return results
    
    def get_checkout_errors(self, merchant_id: Optional[str] = None) -> list[dict]:
        """
        Get checkout-specific errors (convenience method).
        
        Args:
            merchant_id: Optional merchant filter
            
        Returns:
            List of checkout-related API errors
        """
        log_tool_action("log_tool", "get_checkout_errors", {"merchant_id": merchant_id})
        
        return self.get_api_errors(
            merchant_id=merchant_id,
            endpoint="checkout"
        )
    
    def get_error_summary_by_merchant(self, merchant_id: str) -> dict:
        """
        Get a summary of all errors for a specific merchant.
        
        Args:
            merchant_id: The merchant to summarize
            
        Returns:
            Summary dict with error counts and types
        """
        log_tool_action("log_tool", "get_error_summary", {"merchant_id": merchant_id})
        
        api_errors = self.get_api_errors(merchant_id=merchant_id)
        webhook_failures = self.get_webhook_failures(merchant_id=merchant_id)
        
        return {
            "merchant_id": merchant_id,
            "api_error_count": len(api_errors),
            "api_error_total_occurrences": sum(e.get("occurrence_count", 0) for e in api_errors),
            "webhook_failure_count": len(webhook_failures),
            "unique_error_codes": list(set(e.get("error_code") for e in api_errors)),
            "affected_endpoints": list(set(e.get("endpoint") for e in api_errors)),
            "webhook_version_mismatches": len([
                f for f in webhook_failures 
                if f.get("expected_version") != f.get("actual_version")
            ])
        }
    
    def search_logs(
        self,
        query: str,
        log_type: str = "all"
    ) -> list[dict]:
        """
        Full-text search across log messages.
        
        Args:
            query: Search string (case-insensitive)
            log_type: 'api', 'webhook', or 'all'
            
        Returns:
            List of matching log entries
        """
        log_tool_action("log_tool", "search_logs", {
            "query": query,
            "log_type": log_type
        })
        
        query_lower = query.lower()
        results = []
        
        if log_type in ("api", "all"):
            for error in self._api_errors:
                if query_lower in json.dumps(error).lower():
                    results.append({"type": "api_error", **error})
        
        if log_type in ("webhook", "all"):
            for failure in self._webhook_failures:
                if query_lower in json.dumps(failure).lower():
                    results.append({"type": "webhook_failure", **failure})
        
        return results


# Singleton instance for use by agent modules
log_tool = LogTool()
