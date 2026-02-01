<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11+-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Next.js-15+-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/Google_Gemini-AI-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Gemini">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<h1 align="center">🤖 Data Migration Agent</h1>

<p align="center">
  <strong>An Agentic AI System for Self-Healing Customer Support During E-Commerce Migrations</strong>
</p>

<p align="center">
  <em>Built for Cyber Cypher 5.0 Hackathon</em>
</p>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Application](#running-the-application)
- [API Documentation](#-api-documentation)
- [Agent Loop](#-agent-loop-observe--reason--decide--act)
- [Simulation Data](#-simulation-data)
- [Human-in-the-Loop](#-human-in-the-loop)
- [Ethics & Guardrails](#-ethics--guardrails)
- [Demo Walkthrough](#-demo-walkthrough)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [Team](#-team)
- [License](#-license)
- [Acknowledgments](#-acknowledgments)

---

## 🎯 Overview

**Data Migration Agent** is an autonomous AI system designed to handle customer support issues during hosted-to-headless e-commerce platform migrations. Instead of relying on traditional chatbots, this system uses an **agentic approach** that can:

- **Observe** incoming signals (support tickets, API errors, webhook failures)
- **Reason** about root causes using pattern detection and LLM analysis
- **Decide** on appropriate remediation actions
- **Act** on approved decisions with full audit trails

### The Problem

During e-commerce migrations (hosted → headless), merchants experience:
- 🔴 Checkout failures due to callback URL changes
- 🔴 Webhook version mismatches (v2 → v3)
- 🔴 API authentication issues
- 🔴 Rate limit exceedances during inventory sync
- 🔴 Cache invalidation problems

Traditional support teams struggle to keep up with the volume and complexity of these issues.

### Our Solution

An intelligent agent that:
- Detects patterns across multiple merchants automatically
- Correlates errors with migration stages
- Proposes targeted actions with confidence scores
- Requires human approval for critical actions
- Learns from approval/rejection feedback

---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| **🔍 Pattern Detection** | Automatically clusters similar errors and detects spikes |
| **🧠 LLM-Powered Reasoning** | Uses Google Gemini for root cause analysis |
| **⚡ Real-time Signal Ingestion** | Accepts tickets, API errors, webhooks, and migration updates |
| **👤 Human-in-the-Loop** | Critical actions require human approval |
| **📊 Dashboard UI** | Full Next.js dashboard for monitoring and control |
| **🔒 Guardrails** | Built-in policies preventing dangerous autonomous actions |
| **📝 Full Audit Trail** | Every decision and action is logged |
| **🎭 Simulation Mode** | Demo-safe with realistic test data |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Signals │ │ Patterns│ │Reasoning│ │ Actions │ │  Audit  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼──────────┼──────────┼──────────┼──────────┼───────────┘
        │          │          │          │          │
        └──────────┴──────────┴──────────┴──────────┘
                              │
                      ┌───────▼───────┐
                      │   FastAPI     │
                      │   Backend     │
                      └───────┬───────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
┌───────▼───────┐     ┌───────▼───────┐     ┌───────▼───────┐
│   OBSERVE     │     │    REASON     │     │    DECIDE     │
│ (Pattern Det) │────▶│  (LLM/Rules)  │────▶│ (Action Sel)  │
└───────────────┘     └───────────────┘     └───────┬───────┘
                                                    │
                                            ┌───────▼───────┐
                                            │     ACT       │
                                            │ (w/ Approval) │
                                            └───────────────┘
```

### Component Breakdown

| Component | Responsibility |
|-----------|----------------|
| **Observer Agent** | Pattern detection, spike analysis, clustering |
| **Reasoning Agent** | Root cause hypothesis generation (LLM/heuristics) |
| **Decision Agent** | Action selection with confidence scoring |
| **Action Agent** | Bounded execution with approval gates |
| **Orchestrator** | Coordinates the full Observe→Reason→Decide→Act loop |

---

## 🛠 Tech Stack

### Backend
- **Python 3.11+** - Core language
- **FastAPI** - High-performance async API framework
- **Pydantic** - Data validation and schemas
- **SQLite** - Lightweight persistent storage
- **Google Gemini** - LLM for reasoning (optional)
- **Uvicorn** - ASGI server

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful component library

### DevOps
- **Docker** - Containerization (optional)
- **uv** - Fast Python package manager

---

## 📁 Project Structure

```
DATA_MIGRATION_AGENT/
│
├── 📄 README.md                    # You are here
├── 📄 architecture.md              # System architecture details
├── 📄 agent_loop.md                # Agent loop documentation
├── 📄 ethics_and_guardrails.md     # Safety policies
│
├── 📂 backend/                     # Python FastAPI backend
│   ├── 📂 api/
│   │   ├── main.py                 # FastAPI entrypoint
│   │   ├── schemas.py              # Pydantic models
│   │   └── 📂 routes/
│   │       ├── agent.py            # Agent state endpoints
│   │       ├── signals.py          # Signal ingestion
│   │       ├── actions.py          # Approval workflow
│   │       ├── incidents.py        # Incident management
│   │       └── migration.py        # Migration tracking
│   │
│   ├── 📂 agents/
│   │   ├── observer_agent.py       # Pattern detection
│   │   ├── reasoning_agent.py      # Root cause analysis
│   │   ├── decision_agent.py       # Action selection
│   │   └── action_agent.py         # Bounded execution
│   │
│   ├── 📂 orchestrator/
│   │   └── agent_orchestrator.py   # Main agent loop
│   │
│   ├── 📂 tools/
│   │   ├── ticket_tool.py          # Support ticket interface
│   │   ├── log_tool.py             # Error log queries
│   │   ├── escalation_tool.py      # Jira/Slack simulation
│   │   ├── doc_tool.py             # Doc update proposals
│   │   └── llm_client.py           # Gemini integration
│   │
│   ├── 📂 memory/
│   │   ├── memory_manager.py       # State persistence
│   │   └── event_store.py          # Event storage
│   │
│   ├── 📂 simulations/
│   │   ├── tickets.json            # Sample support tickets
│   │   ├── api_errors.json         # API error samples
│   │   ├── webhook_failures.json   # Webhook failure data
│   │   └── migration_states.json   # Merchant migration states
│   │
│   ├── 📂 config/
│   │   ├── agent_policies.yaml     # What agent can/cannot do
│   │   ├── thresholds.yaml         # Confidence thresholds
│   │   └── risk_matrix.yaml        # Risk assessment rules
│   │
│   ├── 📂 utils/
│   │   └── logger.py               # Centralized logging
│   │
│   ├── pyproject.toml              # Python dependencies
│   ├── run_backend.py              # Server startup
│   └── run_full_demo.py            # Full demo script
│
└── 📂 frontend/                    # Next.js dashboard
    ├── 📂 app/
    │   ├── page.tsx                # Home page
    │   ├── layout.tsx              # Root layout
    │   ├── 📂 signals/             # Signal monitoring
    │   ├── 📂 patterns/            # Pattern detection view
    │   ├── 📂 reasoning/           # Reasoning display
    │   ├── 📂 actions/             # Action approval UI
    │   ├── 📂 incidents/           # Incident management
    │   └── 📂 audit/               # Audit trail
    │
    ├── 📂 components/              # Reusable UI components
    ├── 📂 lib/                     # Utilities and API client
    └── 📂 types/                   # TypeScript types
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.11+** - [Download](https://python.org)
- **Node.js 18+** - [Download](https://nodejs.org)
- **Git** - [Download](https://git-scm.com)
- **(Optional) Google Gemini API Key** - For LLM reasoning

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/data_migration_agent.git
   cd data_migration_agent
   ```

2. **Set up the backend**
   ```bash
   cd backend
   
   # Option A: Using pip
   pip install fastapi uvicorn pydantic google-generativeai python-dotenv
   
   # Option B: Using uv (recommended)
   uv sync
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Configuration

1. **Create environment file** (optional, for LLM features)
   ```bash
   cd backend
   cp .env.example .env
   ```

2. **Add your Gemini API key** (if using LLM)
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

### Running the Application

#### Option 1: Run Both Services

**Terminal 1 - Backend:**
```bash
cd backend
python run_backend.py
# or: uvicorn api.main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

#### Option 2: Run Full Demo (Backend Only)

```bash
cd backend

# Without LLM (fast, uses heuristics)
python run_full_demo.py

# With LLM (requires GEMINI_API_KEY)
python run_full_demo.py --use-llm
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend Dashboard | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Documentation (Swagger) | http://localhost:8000/docs |
| API Documentation (ReDoc) | http://localhost:8000/redoc |

---

## 📚 API Documentation

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/signals/ingest` | Ingest signals (tickets, errors, webhooks) |
| `GET` | `/signals/pending` | Get unprocessed signals |
| `GET` | `/agent/state` | Get agent's current state |
| `GET` | `/agent/status` | Quick status summary |
| `POST` | `/actions/approve` | Approve/reject proposed actions |
| `GET` | `/actions/pending` | List actions awaiting approval |
| `GET` | `/incidents` | Get detected incidents |
| `GET` | `/simulations/load` | Load simulation data |
| `GET` | `/health` | Health check |

### Example: Ingest a Signal

```bash
curl -X POST http://localhost:8000/signals/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "signals": [{
      "signal_type": "api_error",
      "source": "datadog",
      "severity": "high",
      "error_code": "PAYMENT_CALLBACK_INVALID",
      "endpoint": "/api/v3/checkout/complete",
      "merchant_id": "MERCH-A1B2C3",
      "error_message": "Payment callback URL validation failed"
    }]
  }'
```

### Example: Approve an Action

```bash
curl -X POST http://localhost:8000/actions/approve \
  -H "Content-Type: application/json" \
  -d '{
    "action_id": "ACT-12345678",
    "approved": true,
    "reviewer": "admin@example.com",
    "feedback": "Looks good, proceed with escalation"
  }'
```

---

## 🔄 Agent Loop: Observe → Reason → Decide → Act

### 1. OBSERVE 👁️
The Observer Agent analyzes incoming signals without any LLM calls:

- **Error Clustering**: Groups similar errors by code/endpoint
- **Spike Detection**: Identifies temporal anomalies
- **Migration Correlation**: Links errors to migration stages
- **Severity Analysis**: Prioritizes by impact

### 2. REASON 🧠
The Reasoning Agent generates hypotheses:

- **Heuristic Mode**: Fast rule-based analysis
- **LLM Mode**: Deep analysis using Google Gemini
- Produces ranked hypotheses with confidence scores

### 3. DECIDE ⚖️
The Decision Agent selects actions:

- Maps hypotheses to action types
- Calculates risk scores
- Determines if human approval is required
- Applies policy guardrails

### 4. ACT 🎬
The Action Agent executes approved actions:

- **Dry-run mode**: Logs without executing
- **Simulated tools**: No real external calls
- Full audit trail for every action

---

## 📊 Simulation Data

The system includes realistic simulation data representing common migration issues:

### Support Tickets (`tickets.json`)
- Checkout failures post-migration
- Webhook notification issues
- Pricing display problems
- Rate limit complaints

### API Errors (`api_errors.json`)
- `PAYMENT_CALLBACK_INVALID` - HTTPS requirement for headless
- `WEBHOOK_ENDPOINT_NOT_FOUND` - v2→v3 migration
- `RATE_LIMIT_EXCEEDED` - Inventory sync issues
- `AUTH_TOKEN_VERSION_MISMATCH` - Token regeneration needed

### Webhook Failures (`webhook_failures.json`)
- Version mismatches (v2 vs v3)
- Signature validation failures
- Connection timeouts
- Schema mismatches

### Migration States (`migration_states.json`)
- 6 merchants at various stages
- Pre-migration, in-progress, post-migration
- Health scores and issue counts

---

## 👤 Human-in-the-Loop

The system enforces human approval for:

- **High-risk actions** (confidence < 0.7)
- **Critical severity** issues
- **Multi-merchant** impact
- **Escalations** to external systems

### Approval Workflow

1. Agent proposes action with confidence score
2. Action appears in "Pending Approval" queue
3. Human reviews reasoning and context
4. Human approves or rejects with feedback
5. Feedback stored for agent learning

---

## 🛡️ Ethics & Guardrails

### What the Agent CAN Do ✅
- Detect patterns in signals
- Generate hypotheses
- Propose actions for approval
- Execute approved low-risk actions
- Log all activities

### What the Agent CANNOT Do ❌
- Execute without approval (for risky actions)
- Modify production data
- Access payment information
- Contact merchants directly
- Override human decisions

### Safety Mechanisms
- Dry-run mode by default
- Simulated tool interfaces
- Confidence thresholds
- Rate limiting
- Full audit logging

---

## 🎬 Demo Walkthrough

### Quick Demo (30 seconds)

```bash
cd backend
python run_full_demo.py
```

This will:
1. Load simulation data
2. Run the agent loop
3. Display detected patterns
4. Show proposed actions
5. Output results to console

### Full Demo with UI (5 minutes)

1. Start backend: `python run_backend.py`
2. Start frontend: `cd ../frontend && npm run dev`
3. Open http://localhost:3000
4. Navigate through:
   - **Signals** - View ingested signals
   - **Patterns** - See detected patterns
   - **Reasoning** - View AI hypotheses
   - **Actions** - Approve/reject actions
   - **Audit** - Review decision history

---

## 📸 Screenshots

| Dashboard Home | Signals View |
|----------------|--------------|
| *Agent status overview* | *Real-time signal monitoring* |

| Pattern Detection | Action Approval |
|-------------------|-----------------|
| *Clustered errors* | *Human-in-the-loop UI* |

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow PEP 8 for Python code
- Use TypeScript strict mode for frontend
- Write docstrings for all functions
- Add tests for new features
- Update documentation

---

## 👥 Team

Built for **Cyber Cypher 5.0** Hackathon

| Role | Responsibility |
|------|----------------|
| **Member 1** | Agent Intelligence (Observer, Reasoning, Decision) |
| **Member 2** | Backend & Integrations (APIs, Tools, Simulations) |
| **Member 3** | Frontend & UX (Dashboard, Visualizations) |

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2026 Data Migration Agent Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **Cyber Cypher 5.0** - For hosting this amazing hackathon
- **Google Gemini** - For powerful LLM capabilities
- **FastAPI** - For the excellent Python framework
- **Vercel/Next.js** - For the React framework
- **shadcn/ui** - For beautiful UI components

---

<p align="center">
  <strong>Built with ❤️ for Cyber Cypher 5.0</strong>
</p>

<p align="center">
  <a href="#-data-migration-agent">⬆️ Back to Top</a>
</p>
