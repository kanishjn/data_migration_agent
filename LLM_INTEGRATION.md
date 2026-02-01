# LLM Integration Guide

## Overview

The Migration Agent system integrates Google Gemini for intelligent reasoning, decision-making, and message generation. LLM usage is **constrained**, **auditable**, and **validated** according to safety principles.

## Architecture

### Where LLMs are Used

1. **Reasoning Agent** (🧠 Primary Use)
   - Generates root cause hypotheses from observed patterns
   - Correlates issues with known problems and recent changes
   - Provides confidence scores and evidence lists
   - **No LLM**: Observation layer (pure data analysis)

2. **Decision Agent** (⚖️ Assisted Use)
   - Suggests appropriate actions based on root cause
   - LLM suggests → Rules validate → Human approves
   - Safety rules override LLM recommendations

3. **Action Agent** (✍️ Drafting Only)
   - Drafts merchant-facing messages
   - Generates incident reports
   - **Always requires human review before sending**

### Where LLMs are NOT Used

- **Observation Layer**: Pure pattern detection (clustering, correlation)
- **Action Execution**: No LLM touches production systems
- **Approval Gates**: Human-in-the-loop enforced by rules

## Setup

### 1. Install Dependencies

```bash
cd backend
uv sync
```

This installs:
- `google-generativeai>=0.3.0`
- `pydantic>=2.9.0` (for structured output validation)

### 2. Get API Key

Get a free Google Gemini API key:
- Visit: https://ai.google.dev/
- Click "Get API Key"
- Create a new project or use existing
- Copy the API key

### 3. Set Environment Variable

```bash
# Linux/macOS
export GEMINI_API_KEY='your-api-key-here'

# Or in your shell profile (~/.zshrc, ~/.bashrc)
echo 'export GEMINI_API_KEY="your-key"' >> ~/.zshrc
source ~/.zshrc
```

## Usage

### Running with LLM Enabled

```bash
cd backend

# Simple run (uses LLM if API key is set)
uv run python dry_run_llm.py

# Or with explicit API key
GEMINI_API_KEY='your-key' uv run python dry_run_llm.py
```

### Running without LLM (Heuristic Mode)

```bash
# Unset the API key to test fallback
unset GEMINI_API_KEY
uv run python dry_run_llm.py

# Or use the standard dry run
uv run python dry_run_enhanced.py
```

## LLM Client Architecture

### Provider-Agnostic Design

```python
from tools.llm_client import llm_client, ReasoningOutputSchema

# Automatic schema validation
result = llm_client.generate(
    prompt="Analyze this incident...",
    system_instruction="You are an SRE...",
    response_schema=ReasoningOutputSchema,  # Pydantic schema
    temperature=0.0,  # Deterministic
    max_output_tokens=1500
)
```

### Structured Output Validation

All LLM outputs are validated with Pydantic schemas:

```python
class HypothesisSchema(BaseModel):
    cause: str
    confidence: float  # 0.0 - 1.0
    reasoning: str
    evidence: list[str]

class ReasoningOutputSchema(BaseModel):
    primary_hypothesis: HypothesisSchema
    alternative_hypotheses: list[HypothesisSchema]
    unknowns: list[str]
```

If validation fails → automatic retry (up to 2 retries) → fallback to heuristics

### Retry Logic

```python
def generate(..., max_retries=2):
    for attempt in range(max_retries + 1):
        try:
            response = call_gemini()
            validated = schema.model_validate(response)
            return validated
        except (JSONDecodeError, ValidationError):
            if attempt < max_retries:
                time.sleep(1 + attempt * 2)  # Exponential backoff
                continue
    raise RuntimeError("LLM failed after retries")
```

## Safety Guardrails

### 1. Schema Validation

Every LLM response must match a strict Pydantic schema. Invalid responses are rejected.

### 2. Confidence Thresholds

```python
# Decision agent rules
if confidence > 0.7 and has_checkout_impact:
    # High confidence + revenue impact → escalate
    action = "engineering_escalation"
    requires_approval = True

elif confidence < 0.5:
    # Low confidence → human review
    action = "human_review_request"
```

### 3. Action Validation

LLM suggests actions → Safety rules validate:

```python
def _validate_and_enhance_decision(llm_decision):
    # Force approval for revenue-impacting actions
    if has_checkout_impact:
        llm_decision["requires_human_approval"] = True
    
    # Override risk level if needed
    if has_checkout_impact and confidence > 0.5:
        llm_decision["risk_level"] = "high"
    
    return llm_decision
```

### 4. Forbidden Actions

LLMs **cannot** suggest:
- Code deployments
- Config changes
- Merchant account modifications
- Checkout flow alterations

These are enforced at the action handler level.

### 5. Audit Trail

Every LLM call is logged:

```python
{
    "timestamp": "2026-01-31T10:15:00Z",
    "agent": "reasoning",
    "prompt_tokens": 450,
    "output_tokens": 120,
    "model": "gemini-1.5-flash",
    "cost_usd": 0.0002,
    "output_validated": true,
    "schema": "ReasoningOutputSchema"
}
```

## Prompt Engineering

### Reasoning Agent Prompt Structure

```
SYSTEM INSTRUCTION:
You are an expert SRE analyzing migration incidents.
Output MUST be valid JSON matching the schema.
Be precise, technical, and cite evidence.

USER PROMPT:
OBSERVATION SUMMARY: [patterns detected]
CONTEXT: [known issues, recent changes]
TASK: Generate hypotheses with confidence scores
```

### Key Principles

1. **Structured Output**: Always specify JSON schema in system instruction
2. **Few-Shot Examples**: Include 1-2 example outputs (not shown in prod to save tokens)
3. **Temperature**: 0.0 for reasoning/decisions, 0.7 for message drafting
4. **Context Window**: Include only relevant context (top 5 known issues, recent 5 changes)
5. **Citations**: Require LLM to cite evidence from provided context

## Cost Management

### Token Usage Tracking

```python
from tools.llm_client import llm_client

stats = llm_client.get_usage_stats()
# {
#     "total_calls": 5,
#     "total_input_tokens": 2450,
#     "total_output_tokens": 680,
#     "estimated_cost_usd": 0.0008
# }
```

### Gemini Pricing (as of 2024)

- **Gemini 1.5 Flash** (recommended):
  - Input: $0.075 per 1M tokens
  - Output: $0.30 per 1M tokens
- **Free tier**: 15 requests/minute, 1M tokens/day

### Cost Optimization

1. **Use Flash model**: 20x cheaper than Pro
2. **Limit context**: Only include top-N relevant docs/issues
3. **Cache responses**: For repeated patterns (not yet implemented)
4. **Batch requests**: Process multiple events together

## Testing

### Unit Tests

```bash
# Test with mocked LLM (no API calls)
pytest tests/test_reasoning_agent.py

# Test LLM integration (requires API key)
GEMINI_API_KEY='your-key' pytest tests/test_llm_integration.py
```

### Integration Test

```bash
# Run full pipeline with LLM
GEMINI_API_KEY='your-key' uv run python dry_run_llm.py
```

## Fallback Behavior

If LLM fails (no API key, quota exceeded, network error):

1. **Reasoning Agent**: Falls back to heuristic rules
2. **Decision Agent**: Uses pure rule-based logic
3. **Action Agent**: Uses message templates

System continues to function without LLMs.

## Monitoring

### Metrics to Track

- LLM call latency (p50, p95, p99)
- Schema validation failure rate
- Fallback trigger rate
- Token usage per incident
- Cost per incident analyzed
- Confidence score distribution

### Alerts

- LLM error rate > 10%
- Average latency > 5s
- Daily cost > $10

## Future Enhancements

### Retrieval-Augmented Generation (RAG)

```python
# Not yet implemented
from tools.embedding_client import search_docs

# Retrieve relevant docs
docs = search_docs(query="webhook migration issues", top_k=5)

# Include in prompt
prompt = f"""
RELEVANT DOCUMENTATION:
{docs}

INCIDENT PATTERNS:
{patterns}

Analyze and generate hypothesis...
"""
```

### Caching

```python
# Not yet implemented
import hashlib

def get_cached_response(prompt_hash):
    # Check Redis/Memcached for cached LLM response
    pass
```

### Multi-Model Routing

```python
# Not yet implemented
if incident_severity == "critical":
    model = "gemini-1.5-pro"  # More capable, slower
else:
    model = "gemini-1.5-flash"  # Faster, cheaper
```

## Troubleshooting

### Issue: "No Gemini API key found"

**Solution**: Set the environment variable:
```bash
export GEMINI_API_KEY='your-key-here'
```

### Issue: "Rate limit exceeded"

**Solution**: 
- Free tier: 15 requests/minute
- Wait 1 minute or upgrade to paid tier
- Implement exponential backoff (already included)

### Issue: "Schema validation failed"

**Solution**:
- Check `tool_logger` for LLM raw output
- LLM might be generating invalid JSON
- Retry logic will attempt 2 more times
- Falls back to heuristics if all fail

### Issue: "High latency (>10s)"

**Causes**:
- Large context window (>100K tokens)
- Network issues
- Gemini API slowdown

**Solutions**:
- Reduce context size
- Use Flash model (faster)
- Add timeout to LLM calls

## Security

### API Key Management

- **Never commit API keys to git**
- Use environment variables only
- In production: Use secret management (AWS Secrets Manager, HashiCorp Vault)

### Data Privacy

- Don't send PII to LLM (merchant emails, payment details)
- Anonymize merchant IDs in prompts
- Log prompts but redact sensitive data

### Compliance

- GDPR: Don't send EU customer data without consent
- PCI-DSS: Never send payment card data
- Audit all LLM inputs/outputs

## References

- [Google Gemini Documentation](https://ai.google.dev/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [OpenAI Best Practices](https://platform.openai.com/docs/guides/prompt-engineering)
