"""
FastAPI Application - Data Migration Agent Backend

This is the main entry point for the backend API. It provides:
- Signal ingestion endpoints for tickets, errors, and webhooks
- Agent state querying endpoints
- Human approval workflow endpoints
- Simulation data loading endpoints

NOTE: This backend provides infrastructure only.
Agent reasoning/decision logic is implemented in separate modules.
"""

import json
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

import sys
sys.path.append(str(Path(__file__).parent.parent))

from api.routes import agent, signals, actions
from api.schemas import (
    HealthResponse,
    SimulationDataType,
    SimulationLoadResponse,
    ErrorResponse,
)
from utils.logger import api_logger


# =============================================================================
# Simulation Data Paths
# =============================================================================

SIMULATIONS_DIR = Path(__file__).parent.parent / "simulations"


# =============================================================================
# Application Lifecycle
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    api_logger.info("Data Migration Agent Backend starting up...")
    api_logger.info(f"Simulation data directory: {SIMULATIONS_DIR}")
    
    # Verify simulation files exist
    simulation_files = [
        "tickets.json",
        "api_errors.json",
        "webhook_failures.json",
        "migration_states.json",
    ]
    
    for filename in simulation_files:
        filepath = SIMULATIONS_DIR / filename
        if filepath.exists():
            api_logger.info(f"✓ Found simulation data: {filename}")
        else:
            api_logger.warning(f"✗ Missing simulation data: {filename}")
    
    yield
    
    api_logger.info("Data Migration Agent Backend shutting down...")


# =============================================================================
# FastAPI Application
# =============================================================================

app = FastAPI(
    title="Data Migration Agent API",
    description="""
Backend API for the Data Migration Agent - an agentic AI system for 
self-healing customer support during hosted-to-headless e-commerce migrations.

## Overview

This API provides:

- **Signal Ingestion**: Accept tickets, API errors, webhook failures, and migration updates
- **Agent State**: Query the agent's current understanding and proposed actions
- **Human Approval**: Approve or reject agent-proposed actions
- **Simulations**: Load realistic test data for demonstrations

## Architecture

The agent follows an Observe → Reason → Decide → Act loop:

1. **Observe**: Ingest signals via `/signals/ingest`
2. **Reason**: Agent analyzes patterns (separate module)
3. **Decide**: Agent proposes actions with confidence scores
4. **Act**: Execute approved actions via simulated tools

## Human-in-the-Loop

All agent actions require human approval before execution.
Use `/actions/approve` to approve or reject proposed actions.
    """,
    version="0.1.0",
    lifespan=lifespan,
)


# =============================================================================
# CORS Middleware
# =============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Include Routers
# =============================================================================

app.include_router(signals.router)
app.include_router(agent.router)
app.include_router(actions.router)


# =============================================================================
# Root Endpoints
# =============================================================================

@app.get("/", tags=["root"])
async def root() -> dict[str, str]:
    """Root endpoint with API information."""
    return {
        "name": "Data Migration Agent API",
        "version": "0.1.0",
        "description": "Backend for agentic AI customer support during e-commerce migrations",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health", response_model=HealthResponse, tags=["root"])
async def health_check() -> HealthResponse:
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        timestamp=datetime.utcnow(),
    )


# =============================================================================
# Simulation Endpoints
# =============================================================================

@app.get(
    "/simulations/load",
    response_model=SimulationLoadResponse,
    tags=["simulations"],
    responses={
        404: {"model": ErrorResponse, "description": "Simulation data not found"},
        500: {"model": ErrorResponse, "description": "Failed to load simulation data"},
    },
)
async def load_simulation_data(
    data_type: SimulationDataType = SimulationDataType.ALL
) -> SimulationLoadResponse:
    """
    Load simulation data from JSON files.
    
    Available data types:
    - `tickets`: Support ticket examples
    - `api_errors`: API error log samples
    - `webhook_failures`: Webhook failure examples
    - `migration_states`: Merchant migration status data
    - `all`: Load all simulation data
    
    This data is used for demonstrations and testing the agent's
    observe-reason-decide-act loop.
    """
    file_mapping = {
        SimulationDataType.TICKETS: "tickets.json",
        SimulationDataType.API_ERRORS: "api_errors.json",
        SimulationDataType.WEBHOOK_FAILURES: "webhook_failures.json",
        SimulationDataType.MIGRATION_STATES: "migration_states.json",
    }
    
    try:
        if data_type == SimulationDataType.ALL:
            # Load all simulation data
            all_data: list[dict[str, Any]] = []
            
            for dtype, filename in file_mapping.items():
                filepath = SIMULATIONS_DIR / filename
                if filepath.exists():
                    with open(filepath, "r") as f:
                        data = json.load(f)
                        for item in data:
                            item["_data_type"] = dtype.value
                        all_data.extend(data)
            
            api_logger.info(f"Loaded all simulation data: {len(all_data)} records")
            
            return SimulationLoadResponse(
                data_type="all",
                record_count=len(all_data),
                data=all_data,
                loaded_at=datetime.utcnow(),
            )
        
        else:
            # Load specific data type
            filename = file_mapping.get(data_type)
            if not filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unknown data type: {data_type}"
                )
            
            filepath = SIMULATIONS_DIR / filename
            
            if not filepath.exists():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Simulation data not found: {filename}"
                )
            
            with open(filepath, "r") as f:
                data = json.load(f)
            
            api_logger.info(f"Loaded simulation data '{data_type.value}': {len(data)} records")
            
            return SimulationLoadResponse(
                data_type=data_type.value,
                record_count=len(data),
                data=data,
                loaded_at=datetime.utcnow(),
            )
    
    except json.JSONDecodeError as e:
        api_logger.error(f"Failed to parse simulation data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse simulation data: {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        api_logger.error(f"Error loading simulation data: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error loading simulation data: {str(e)}"
        )


@app.get("/simulations/available", tags=["simulations"])
async def list_available_simulations() -> dict[str, Any]:
    """
    List available simulation data files and their record counts.
    """
    available = {}
    
    for dtype in SimulationDataType:
        if dtype == SimulationDataType.ALL:
            continue
        
        filename = {
            SimulationDataType.TICKETS: "tickets.json",
            SimulationDataType.API_ERRORS: "api_errors.json",
            SimulationDataType.WEBHOOK_FAILURES: "webhook_failures.json",
            SimulationDataType.MIGRATION_STATES: "migration_states.json",
        }.get(dtype)
        
        if filename:
            filepath = SIMULATIONS_DIR / filename
            if filepath.exists():
                try:
                    with open(filepath, "r") as f:
                        data = json.load(f)
                    available[dtype.value] = {
                        "filename": filename,
                        "record_count": len(data),
                        "available": True,
                    }
                except Exception:
                    available[dtype.value] = {
                        "filename": filename,
                        "record_count": 0,
                        "available": False,
                        "error": "Failed to parse file",
                    }
            else:
                available[dtype.value] = {
                    "filename": filename,
                    "record_count": 0,
                    "available": False,
                }
    
    return {
        "simulations_dir": str(SIMULATIONS_DIR),
        "data_types": available,
    }
