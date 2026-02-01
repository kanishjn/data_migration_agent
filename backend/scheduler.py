#!/usr/bin/env python3
"""
Standalone scheduler for incident detection.

Run this script to process events periodically (every 5 min by default).
Use when the API server is not running or when running the job in a separate process.

Usage:
  python -m scheduler           # Run with default 5-min interval
  python -m scheduler --interval 1  # Run every 1 minute
  python -m scheduler --once     # Run once and exit
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from jobs.detect_incidents import run_detect_incidents
from utils.logger import api_logger

try:
    from config import get
except ImportError:
    get = lambda k, d: d


def main():
    parser = argparse.ArgumentParser(description="Run incident detection scheduler")
    parser.add_argument("--interval", type=int, default=None, help="Interval in minutes (default: from config)")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()

    interval_min = args.interval or get("scheduler.interval_minutes", 5)

    if args.once:
        api_logger.info("Running incident detection once...")
        result = run_detect_incidents()
        api_logger.info(f"Done: {result}")
        return

    api_logger.info(f"Starting scheduler: detect_incidents every {interval_min} minutes")
    while True:
        try:
            result = run_detect_incidents()
            api_logger.info(f"Cycle complete: {result}")
        except Exception as e:
            api_logger.error(f"Scheduler error: {e}")
        time.sleep(interval_min * 60)


if __name__ == "__main__":
    main()
