import json
from orchestrator import AgentOrchestrator

with open("simulations/api_errors.json") as f:
    signals = json.load(f)

agent = AgentOrchestrator()
result = agent.run(signals)

print(json.dumps(result, indent=2))