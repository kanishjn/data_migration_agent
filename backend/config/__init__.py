"""Configuration management for Migration Incident Intelligence System."""

from pathlib import Path
import os
import yaml
from typing import Any, Optional

_CONFIG: Optional[dict] = None
_CONFIG_PATH = Path(__file__).parent / "settings.yaml"

# Required env vars for production (optional for dev/demo)
REQUIRED_ENV_VARS = ["AGENT_DB_PATH"]  # Optional - has default
OPTIONAL_ENV_VARS = ["GEMINI_API_KEY", "MIGRATION_SCHEDULER_ENABLED", "MIGRATION_USE_LLM"]


def validate_config() -> dict[str, Any]:
    """Validate config and return any warnings/errors."""
    issues = []
    config = load_config()

    if not config.get("scheduler", {}).get("enabled", True):
        issues.append({"type": "info", "msg": "Scheduler disabled - run detect_incidents manually"})

    db_path = os.getenv("AGENT_DB_PATH", "memory/agent_state.sqlite")
    if not os.path.isdir(os.path.dirname(db_path) or "."):
        issues.append({"type": "warning", "msg": f"Database directory may not exist: {db_path}"})

    return {"valid": len([i for i in issues if i["type"] == "error"]) == 0, "issues": issues}


def load_config() -> dict[str, Any]:
    """Load configuration from YAML file."""
    global _CONFIG
    if _CONFIG is not None:
        return _CONFIG

    if _CONFIG_PATH.exists():
        with open(_CONFIG_PATH) as f:
            _CONFIG = yaml.safe_load(f) or {}
    else:
        _CONFIG = {}

    # Apply environment overrides
    env_mapping = {
        "MIGRATION_OBSERVATION_WINDOW_MINUTES": ("observation", "window_size_minutes", int),
        "MIGRATION_PATTERN_THRESHOLD": ("observation", "pattern_detection_threshold", int),
        "MIGRATION_SPIKE_THRESHOLD": ("observation", "spike_threshold", int),
        "MIGRATION_CONFIDENCE_THRESHOLD": ("reasoning", "confidence_threshold", float),
        "MIGRATION_SCHEDULER_ENABLED": ("scheduler", "enabled", lambda x: x.lower() == "true"),
        "MIGRATION_SCHEDULER_INTERVAL": ("scheduler", "interval_minutes", int),
        "MIGRATION_USE_LLM": ("reasoning", "use_llm", lambda x: x.lower() == "true"),
    }

    for env_var, (section, key, coerce) in env_mapping.items():
        val = os.getenv(env_var)
        if val is not None:
            try:
                if section not in _CONFIG:
                    _CONFIG[section] = {}
                _CONFIG[section][key] = coerce(val)
            except (ValueError, TypeError):
                pass

    return _CONFIG


def get(key_path: str, default: Any = None) -> Any:
    """
    Get config value by dot path (e.g., 'observation.window_size_minutes').
    """
    config = load_config()
    keys = key_path.split(".")
    val = config
    for k in keys:
        val = val.get(k) if isinstance(val, dict) else default
        if val is None:
            return default
    return val if val is not None else default
