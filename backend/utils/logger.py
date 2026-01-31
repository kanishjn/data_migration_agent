"""
Centralized logging configuration for the Data Migration Agent backend.

Provides structured logging for all backend components including:
- API requests/responses
- Tool actions (simulated)
- Signal ingestion
- Human approval workflows
"""

import logging
import sys
from datetime import datetime
from typing import Optional


def setup_logger(
    name: str,
    level: int = logging.INFO,
    log_file: Optional[str] = None
) -> logging.Logger:
    """
    Create and configure a logger instance.
    
    Args:
        name: Logger name (typically module name)
        level: Logging level (default: INFO)
        log_file: Optional file path for file logging
        
    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # Format: timestamp | level | name | message
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # Optional file handler
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    return logger


# Pre-configured loggers for different components
api_logger = setup_logger("api")
tool_logger = setup_logger("tools")
signal_logger = setup_logger("signals")
action_logger = setup_logger("actions")


def log_tool_action(tool_name: str, action: str, details: dict) -> dict:
    """
    Log a simulated tool action with structured data.
    
    This function is used by all tool interfaces to maintain
    a consistent audit trail of simulated actions.
    
    Args:
        tool_name: Name of the tool (e.g., "ticket_tool")
        action: Action performed (e.g., "update_ticket")
        details: Dictionary of action details
        
    Returns:
        Log entry dictionary for potential storage/forwarding
    """
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "tool": tool_name,
        "action": action,
        "details": details,
        "simulated": True  # Always true - we never perform real actions
    }
    
    tool_logger.info(f"[{tool_name}] {action}: {details}")
    
    return log_entry


def log_signal_received(signal_type: str, signal_id: str, source: str) -> None:
    """Log receipt of an incoming signal."""
    signal_logger.info(f"Signal received: type={signal_type}, id={signal_id}, source={source}")


def log_approval_decision(action_id: str, approved: bool, reviewer: str) -> None:
    """Log a human approval decision."""
    decision = "APPROVED" if approved else "REJECTED"
    action_logger.info(f"Action {action_id} {decision} by {reviewer}")
