"""
Logs API endpoints for streaming agent logs
"""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pathlib import Path
import asyncio
from typing import AsyncGenerator

router = APIRouter()

LOG_FILE = Path(__file__).parent.parent.parent / "logs" / "agent.log"


async def tail_logs(lines: int = 100) -> AsyncGenerator[str, None]:
    """
    Stream log file contents, similar to 'tail -f'
    """
    try:
        # First, send the last N lines
        if LOG_FILE.exists():
            with open(LOG_FILE, 'r') as f:
                all_lines = f.readlines()
                recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
                for line in recent_lines:
                    yield f"data: {line}\n\n"
        
        # Then, stream new lines as they appear
        last_size = LOG_FILE.stat().st_size if LOG_FILE.exists() else 0
        
        while True:
            await asyncio.sleep(0.5)  # Poll every 500ms
            
            if not LOG_FILE.exists():
                continue
                
            current_size = LOG_FILE.stat().st_size
            
            if current_size > last_size:
                with open(LOG_FILE, 'r') as f:
                    f.seek(last_size)
                    new_lines = f.readlines()
                    for line in new_lines:
                        yield f"data: {line}\n\n"
                last_size = current_size
            elif current_size < last_size:
                # File was truncated/rotated
                last_size = 0
                
    except asyncio.CancelledError:
        # Client disconnected
        pass
    except Exception as e:
        yield f"data: ERROR: {str(e)}\n\n"


@router.get("/stream")
async def stream_logs(lines: int = 100):
    """
    Stream agent logs in real-time using Server-Sent Events (SSE)
    
    Args:
        lines: Number of recent lines to show initially (default: 100)
    """
    return StreamingResponse(
        tail_logs(lines),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.get("/recent")
async def get_recent_logs(lines: int = 100):
    """
    Get the last N lines of logs (non-streaming)
    
    Args:
        lines: Number of recent lines to return (default: 100)
    """
    if not LOG_FILE.exists():
        return {"logs": [], "message": "Log file not found"}
    
    try:
        with open(LOG_FILE, 'r') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:] if len(all_lines) > lines else all_lines
            return {
                "logs": [line.strip() for line in recent_lines],
                "total_lines": len(all_lines),
                "showing": len(recent_lines)
            }
    except Exception as e:
        return {"error": str(e), "logs": []}
