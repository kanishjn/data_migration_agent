"""
Run Backend Server

Entry point script to run the Data Migration Agent backend server.

Usage:
    uv run python run_backend.py
    
Or with custom settings:
    uv run python run_backend.py --host 0.0.0.0 --port 8080 --reload

The server will be available at:
    http://localhost:8000 (default)
    http://localhost:8000/docs (Swagger UI)
    http://localhost:8000/redoc (ReDoc)
"""

import argparse
import sys
from pathlib import Path

# Ensure the backend directory is in the path
sys.path.insert(0, str(Path(__file__).parent))


def main():
    """Run the FastAPI backend server."""
    parser = argparse.ArgumentParser(
        description="Run the Data Migration Agent backend server"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host to bind the server to (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind the server to (default: 8000)"
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable auto-reload for development"
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=1,
        help="Number of worker processes (default: 1)"
    )
    
    args = parser.parse_args()
    
    # Import uvicorn here to avoid import errors if not installed
    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn is not installed.")
        print("Install it with: uv add uvicorn")
        sys.exit(1)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           Data Migration Agent - Backend Server              ║
╠══════════════════════════════════════════════════════════════╣
║  Starting server...                                          ║
║                                                              ║
║  API:     http://{args.host}:{args.port:<5}                              ║
║  Docs:    http://{args.host}:{args.port}/docs                       ║
║  ReDoc:   http://{args.host}:{args.port}/redoc                      ║
║                                                              ║
║  Press Ctrl+C to stop                                        ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "api.main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers if not args.reload else 1,
        log_level="info",
    )


if __name__ == "__main__":
    main()
