#!/usr/bin/env python3
"""
Test Gemini API connectivity and readiness.
Verifies API key, quota, and structured output support.
"""
import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_gemini_ready():
    """Test if Gemini API is ready to use."""
    
    print("🔍 Testing Gemini API Connectivity...")
    print("=" * 70)
    
    # 1. Check API key
    print("\n1️⃣  Checking API key...")
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("   ❌ No API key found")
        print("   Set GEMINI_API_KEY or GOOGLE_API_KEY in .env file")
        return False
    else:
        print(f"   ✅ API key found: {api_key[:10]}...{api_key[-4:]}")
    
    # 2. Import and configure Gemini
    print("\n2️⃣  Importing Google Generative AI...")
    try:
        import google.generativeai as genai
        print("   ✅ google-generativeai package imported")
    except ImportError as e:
        print(f"   ❌ Failed to import: {e}")
        print("   Run: pip install google-generativeai")
        return False
    
    # 3. Configure API
    print("\n3️⃣  Configuring Gemini API...")
    try:
        genai.configure(api_key=api_key)
        print("   ✅ API configured")
    except Exception as e:
        print(f"   ❌ Configuration failed: {e}")
        return False
    
    # 4. Test simple generation
    print("\n4️⃣  Testing basic text generation...")
    try:
        model = genai.GenerativeModel("gemini-2.0-flash-exp")
        response = model.generate_content("Say hello in JSON format: {\"message\": \"hello\"}")
        print(f"   ✅ Response received: {response.text[:100]}...")
    except Exception as e:
        print(f"   ❌ Generation failed: {e}")
        if "429" in str(e) or "quota" in str(e).lower():
            print("   ⚠️  API quota exceeded - wait or upgrade plan")
        elif "403" in str(e):
            print("   ⚠️  API key invalid or permission denied")
        return False
    
    # 5. Test structured output with schema
    print("\n5️⃣  Testing structured output (JSON schema)...")
    try:
        schema = {
            "type": "object",
            "properties": {
                "status": {"type": "string"},
                "timestamp": {"type": "string"}
            },
            "required": ["status", "timestamp"]
        }
        
        generation_config = {
            "response_mime_type": "application/json",
            "response_schema": schema,
            "temperature": 0.0
        }
        
        response = model.generate_content(
            "Generate a status check response",
            generation_config=generation_config
        )
        
        result = json.loads(response.text)
        print(f"   ✅ Structured output: {json.dumps(result, indent=2)}")
        
        # Verify schema compliance
        if "status" in result and "timestamp" in result:
            print("   ✅ Schema validation passed")
        else:
            print("   ⚠️  Response missing required fields")
            
    except json.JSONDecodeError as e:
        print(f"   ❌ Invalid JSON returned: {e}")
        print(f"   Response: {response.text[:200]}")
        return False
    except Exception as e:
        print(f"   ❌ Structured output test failed: {e}")
        return False
    
    # 6. Test with our LLM client
    print("\n6️⃣  Testing LLMClient integration...")
    try:
        from tools.llm_client import get_llm_client, ReasoningOutputSchema
        
        client = get_llm_client()
        if not client.client:
            print("   ❌ LLMClient not initialized")
            return False
        
        print("   ✅ LLMClient initialized successfully")
        print(f"   Model: {client.model}")
        print(f"   Provider: {client.provider}")
        
    except Exception as e:
        print(f"   ❌ LLMClient test failed: {e}")
        return False
    
    # 7. Check quota/rate limits
    print("\n7️⃣  Checking usage and quotas...")
    try:
        if hasattr(response, 'usage_metadata'):
            print(f"   Prompt tokens: {response.usage_metadata.prompt_token_count}")
            print(f"   Output tokens: {response.usage_metadata.candidates_token_count}")
            print("   ✅ Token usage tracking available")
        else:
            print("   ⚠️  Token usage metadata not available")
    except Exception as e:
        print(f"   ⚠️  Could not check usage: {e}")
    
    # Success!
    print("\n" + "=" * 70)
    print("✅ ALL TESTS PASSED - Gemini is ready!")
    print("=" * 70)
    print("\n💡 You can now run:")
    print("   python run_full_demo.py --fresh --use-llm")
    print("\n")
    return True


if __name__ == "__main__":
    try:
        success = test_gemini_ready()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
