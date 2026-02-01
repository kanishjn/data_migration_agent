import os
import google.generativeai as genai

# Load API key from .env
with open(".env") as f:
    for line in f:
        if line.strip() and '=' in line:
            key, value = line.split('=', 1)
            os.environ[key.strip()] = value.strip()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

print("Available models:")
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(f"  - {m.name}")
