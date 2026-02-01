"""Test Gemini JSON output directly"""
import os
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ GEMINI_API_KEY not found")
    exit(1)

# Configure Gemini
genai.configure(api_key=api_key)

# Test with JSON MIME type
print("=" * 80)
print("TEST 1: With response_mime_type='application/json'")
print("=" * 80)

generation_config = {
    "temperature": 0.0,
    "max_output_tokens": 500,
    "response_mime_type": "application/json"
}

model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config
)

prompt = """Generate a JSON object with this structure:
{
  "hypothesis": "Migration configuration mismatch",
  "confidence": 0.85,
  "evidence": ["Error codes indicate config issue", "Multiple merchants affected"]
}

Output ONLY valid JSON. No markdown, no explanation."""

response = model.generate_content(prompt)
print(f"\nRaw response text:\n{repr(response.text)}\n")
print(f"Response length: {len(response.text)} chars")

try:
    import json
    parsed = json.loads(response.text)
    print(f"✅ JSON parsed successfully!")
    print(f"Parsed data: {json.dumps(parsed, indent=2)}")
except json.JSONDecodeError as e:
    print(f"❌ JSON parse failed: {e}")

# Test WITHOUT JSON MIME type
print("\n" + "=" * 80)
print("TEST 2: WITHOUT response_mime_type (default)")
print("=" * 80)

generation_config2 = {
    "temperature": 0.0,
    "max_output_tokens": 500
}

model2 = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config=generation_config2
)

response2 = model2.generate_content(prompt)
print(f"\nRaw response text:\n{repr(response2.text)}\n")
print(f"Response length: {len(response2.text)} chars")

try:
    parsed2 = json.loads(response2.text)
    print(f"✅ JSON parsed successfully!")
    print(f"Parsed data: {json.dumps(parsed2, indent=2)}")
except json.JSONDecodeError as e:
    print(f"❌ JSON parse failed: {e}")
