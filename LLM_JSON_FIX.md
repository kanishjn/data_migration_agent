# LLM JSON Parsing Errors - Root Causes & Solutions

## Problem
LLM calls are failing with JSON parsing errors:
```
WARNING | tools | LLM call failed (attempt 1/3): Unterminated string starting at: line 5 column 18 (char 140)
```

## Root Causes

### 1. **Gemini Returns Malformed JSON**
- When generating free-form JSON, Gemini sometimes includes:
  - Unescaped newlines in strings: `"text\n"` instead of `"text\\n"`
  - Unescaped quotes: `"value: "test""` instead of `"value: \"test\""`
  - Extra text outside the JSON object

### 2. **API Rate Limits**
- Gemini Free Tier: **20 requests/day** for gemini-2.5-flash
- You've likely exhausted the quota from earlier testing
- Check status: https://ai.dev/rate-limit

### 3. **Schema Not Properly Passed to Gemini**
- Original code set `response_mime_type: "application/json"` but didn't use Gemini's **native response_schema** parameter
- Gemini 1.5+ supports strict JSON schema enforcement

## Solutions Implemented

### Fix 1: Use Gemini's Native response_schema Parameter ✅
Updated `llm_client.py` to pass Pydantic schemas directly to Gemini:

```python
generation_config["response_schema"] = schema_dict  # Gemini validates output
```

This forces Gemini to return **valid JSON** matching the exact schema.

### Fix 2: Enhanced JSON Extraction ✅
Added robust JSON parsing with:
- Markdown code block detection
- JSON boundary extraction
- Escape sequence fixes for common errors
- Better error messages

### Fix 3: Exponential Backoff ✅
Already implemented - retries 3 times with increasing delays.

## Testing the Fix

### Option 1: Wait for Quota Reset
Gemini free tier resets daily. Wait ~12 hours and try again:

```bash
python run_full_demo.py --fresh --use-llm
```

### Option 2: Test Without LLM (Heuristics)
The system gracefully falls back to heuristics:

```bash
python run_full_demo.py --fresh
# Works instantly, no API calls
```

### Option 3: Upgrade Gemini Plan
Get higher quota at https://ai.google.dev/pricing

## Verification

Check if LLM is actually working:

```bash
# Should take 5-15 seconds if using LLM
python run_full_demo.py --use-llm

# If it completes in < 1s, LLM is not being used (quota exceeded or API issue)
```

## Expected Behavior

**With LLM (--use-llm):**
- Takes 5-15 seconds
- Logs show: "🤖 LLM mode ENABLED - Using Google Gemini"
- Results show: `Method: llm`
- More sophisticated root cause analysis

**Without LLM (default):**
- Completes in < 1 second
- Results show: `Method: heuristic`
- Rule-based pattern matching

## Current Status

✅ **Code Fixed** - LLM client now uses proper schema validation
⚠️ **API Quota** - Likely exhausted (20 requests/day free tier)
✅ **Fallback Works** - Heuristics mode fully functional

The patterns, reasoning, and email features all work correctly with **heuristics mode**. LLM mode is optional for enhanced analysis.
