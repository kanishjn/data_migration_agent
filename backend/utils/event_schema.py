from typing import TypedDict, Optional

class Event(TypedDict):
    event_type: str
    merchant_id: str
    migration_stage: str
    error_code: Optional[str]
    timestamp: str
    raw_text: Optional[str]