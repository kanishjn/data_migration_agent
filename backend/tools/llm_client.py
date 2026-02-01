"""
LLM Client - Provider-agnostic interface for LLM calls
Supports Google Gemini with structured output validation
"""

import os
import json
import time
from typing import Any, Dict, Optional, Type
from enum import Enum
import google.generativeai as genai
from pydantic import BaseModel, ValidationError

from utils.logger import tool_logger


class LLMProvider(str, Enum):
    """Supported LLM providers."""
    GEMINI = "gemini"
    OPENAI = "openai"
    LOCAL = "local"


class HypothesisSchema(BaseModel):
    """Schema for root cause hypothesis."""
    cause: str
    confidence: float
    reasoning: str
    evidence: Optional[list[str]] = None  # Optional for alternative hypotheses


class ReasoningOutputSchema(BaseModel):
    """Schema for reasoning agent output."""
    primary_hypothesis: HypothesisSchema
    alternative_hypotheses: list[HypothesisSchema]
    unknowns: list[str]
    analysis_method: str = "llm"


class ActionSuggestion(BaseModel):
    """Schema for a single action suggestion."""
    type: str
    priority: Optional[str] = None
    reason: str
    details: Dict[str, Any]


class DecisionOutputSchema(BaseModel):
    """Schema for decision agent output."""
    recommended_actions: list[ActionSuggestion]
    risk_level: str
    urgency: str
    requires_human_approval: bool
    reasoning: str


class LLMClient:
    """
    Provider-agnostic LLM client with structured output validation.
    
    Features:
    - Automatic JSON schema validation with Pydantic
    - Retry logic for malformed outputs
    - Token usage tracking
    - Audit logging
    """
    
    def __init__(
        self,
        provider: LLMProvider = LLMProvider.GEMINI,
        api_key: Optional[str] = None,
        model: str = "gemini-2.5-flash",  # Latest Flash model with JSON support
        temperature: float = 0.0,
        max_retries: int = 2
    ):
        """
        Initialize LLM client.
        
        Args:
            provider: LLM provider to use
            api_key: API key (falls back to env var)
            model: Model name
            temperature: Sampling temperature (0.0 = deterministic)
            max_retries: Number of retries for failed calls
        """
        self.provider = provider
        self.model = model
        self.temperature = temperature
        self.max_retries = max_retries
        
        # Track usage for cost monitoring
        self.total_calls = 0
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        
        # Initialize provider
        if provider == LLMProvider.GEMINI:
            self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not self.api_key:
                tool_logger.warning("No Gemini API key found. Set GEMINI_API_KEY or GOOGLE_API_KEY env var.")
                self.client = None
            else:
                genai.configure(api_key=self.api_key)
                self.client = genai.GenerativeModel(model)
                tool_logger.info(f"LLMClient initialized with Gemini model: {model}")
        else:
            raise NotImplementedError(f"Provider {provider} not yet implemented")
    
    def generate(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_schema: Optional[Type[BaseModel]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Generate structured output from LLM.
        
        Args:
            prompt: User prompt
            system_instruction: System instruction for the model
            response_schema: Pydantic schema to validate output
            **kwargs: Additional generation parameters
            
        Returns:
            Validated JSON dict matching the schema
            
        Raises:
            RuntimeError: If all retries fail
        """
        last_error = None
        
        for attempt in range(self.max_retries + 1):
            try:
                # Call the LLM
                response_text = self._call_provider(prompt, system_instruction, **kwargs)
                
                # Parse JSON from response
                parsed_json = self._extract_json(response_text)
                
                # Validate against schema if provided
                if response_schema:
                    validated = response_schema.model_validate(parsed_json)
                    result = validated.model_dump()
                else:
                    result = parsed_json
                
                # Log success
                tool_logger.info(f"LLM call successful (attempt {attempt + 1}/{self.max_retries + 1})")
                self.total_calls += 1
                
                return result
                
            except (json.JSONDecodeError, ValidationError, ValueError) as e:
                last_error = e
                tool_logger.warning(f"LLM call failed (attempt {attempt + 1}/{self.max_retries + 1}): {e}")
                
                if attempt < self.max_retries:
                    time.sleep(1 + attempt * 2)  # Exponential backoff
                    continue
        
        # All retries failed
        error_msg = f"LLM call failed after {self.max_retries + 1} attempts. Last error: {last_error}"
        tool_logger.error(error_msg)
        raise RuntimeError(error_msg)
    
    def _call_provider(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        **kwargs
    ) -> str:
        """Call the actual LLM provider."""
        if self.provider == LLMProvider.GEMINI:
            return self._call_gemini(prompt, system_instruction, **kwargs)
        else:
            raise NotImplementedError(f"Provider {self.provider} not implemented")
    
    def _call_gemini(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        **kwargs
    ) -> str:
        """Call Google Gemini API."""
        if not self.client:
            raise RuntimeError("Gemini client not initialized. Check API key.")
        
        generation_config = {
            "temperature": kwargs.get("temperature", self.temperature),
            "top_p": kwargs.get("top_p", 0.95),
            "top_k": kwargs.get("top_k", 40),
            "max_output_tokens": kwargs.get("max_output_tokens", 2048),
            "response_mime_type": "application/json"  # Force valid JSON output
        }
        
        # Build full prompt with system instruction
        if system_instruction:
            full_prompt = f"{system_instruction}\n\n{prompt}"
        else:
            full_prompt = prompt
        
        # Generate
        response = self.client.generate_content(
            full_prompt,
            generation_config=generation_config
        )
        
        # Track token usage (Gemini specific)
        if hasattr(response, 'usage_metadata'):
            self.total_input_tokens += response.usage_metadata.prompt_token_count
            self.total_output_tokens += response.usage_metadata.candidates_token_count
        
        return response.text
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from LLM response.
        Handles cases where JSON is wrapped in markdown code blocks.
        """
        text = text.strip()
        
        # Try direct JSON parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
        
        # Look for JSON in markdown code blocks
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            json_str = text[start:end].strip()
            return json.loads(json_str)
        
        # Look for any code block
        if "```" in text:
            start = text.find("```") + 3
            end = text.find("```", start)
            json_str = text[start:end].strip()
            return json.loads(json_str)
        
        # Try to find JSON object boundaries
        start = text.find("{")
        end = text.rfind("}") + 1
        
        if start != -1 and end > start:
            json_str = text[start:end]
            return json.loads(json_str)
        
        # Last resort: try parsing the whole thing
        return json.loads(text)
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get token usage statistics."""
        return {
            "total_calls": self.total_calls,
            "total_input_tokens": self.total_input_tokens,
            "total_output_tokens": self.total_output_tokens,
            "estimated_cost_usd": self._estimate_cost()
        }
    
    def _estimate_cost(self) -> float:
        """Estimate cost based on token usage (Gemini Flash pricing)."""
        # Gemini 1.5 Flash pricing (as of 2024)
        # $0.075 per 1M input tokens, $0.30 per 1M output tokens
        if self.provider == LLMProvider.GEMINI and "flash" in self.model.lower():
            input_cost = (self.total_input_tokens / 1_000_000) * 0.075
            output_cost = (self.total_output_tokens / 1_000_000) * 0.30
            return input_cost + output_cost
        return 0.0


# Singleton instance for use across agents
# Lazy initialization - will be configured when first used
llm_client = None

def get_llm_client() -> LLMClient:
    """Get or create the singleton LLM client."""
    global llm_client
    if llm_client is None:
        llm_client = LLMClient()
    return llm_client
