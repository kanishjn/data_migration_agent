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
    details: str  # Changed from Dict[str, Any] because Gemini doesn't support arbitrary objects


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
                # Call the LLM with schema if provided
                response_text = self._call_provider(
                    prompt, 
                    system_instruction, 
                    response_schema=response_schema,
                    **kwargs
                )
                
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
        response_schema: Optional[Type[BaseModel]] = None,
        **kwargs
    ) -> str:
        """Call the actual LLM provider."""
        if self.provider == LLMProvider.GEMINI:
            return self._call_gemini(prompt, system_instruction, response_schema, **kwargs)
        else:
            raise NotImplementedError(f"Provider {self.provider} not implemented")
    
    def _call_gemini(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        response_schema: Optional[Type[BaseModel]] = None,
        **kwargs
    ) -> str:
        """Call Google Gemini API with optional structured output schema."""
        if not self.client:
            raise RuntimeError("Gemini client not initialized. Check API key.")
        
        generation_config = {
            "temperature": kwargs.get("temperature", self.temperature),
            "top_p": kwargs.get("top_p", 0.95),
            "top_k": kwargs.get("top_k", 40),
            "max_output_tokens": kwargs.get("max_output_tokens", 2048),
        }
        
        # Use native response_schema if Pydantic model is provided
        # This forces Gemini to return valid JSON matching the schema
        if response_schema:
            try:
                # Convert Pydantic model to Gemini's schema format
                schema_dict = response_schema.model_json_schema()
                
                # Gemini doesn't support $defs or $ref - need to inline all definitions
                # Remove $defs and resolve references
                if "$defs" in schema_dict:
                    defs = schema_dict.pop("$defs")
                    schema_dict = self._resolve_schema_refs(schema_dict, defs)
                
                # Clean schema to remove unsupported fields (title, etc)
                schema_dict = self._clean_schema_for_gemini(schema_dict)
                
                generation_config["response_mime_type"] = "application/json"
                generation_config["response_schema"] = schema_dict
                
                tool_logger.debug(f"Using Gemini response_schema: {json.dumps(schema_dict, indent=2)[:300]}...")
            except Exception as e:
                tool_logger.warning(f"Could not set response_schema: {e}. Using mime type only.")
                generation_config["response_mime_type"] = "application/json"
        else:
            generation_config["response_mime_type"] = "application/json"  # Force valid JSON output
        
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
    
    def _resolve_schema_refs(self, schema: Dict[str, Any], defs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Resolve $ref references in a JSON schema by inlining definitions.
        Gemini doesn't support $ref, so we need to expand them.
        """
        if isinstance(schema, dict):
            if "$ref" in schema:
                # Extract the definition name from "#/$defs/DefinitionName"
                ref_path = schema["$ref"]
                if ref_path.startswith("#/$defs/"):
                    def_name = ref_path.split("/")[-1]
                    if def_name in defs:
                        # Replace the $ref with the actual definition (recursively resolve it too)
                        resolved = self._resolve_schema_refs(defs[def_name].copy(), defs)
                        return resolved
                return schema
            else:
                # Recursively resolve refs in nested objects
                return {k: self._resolve_schema_refs(v, defs) for k, v in schema.items()}
        elif isinstance(schema, list):
            return [self._resolve_schema_refs(item, defs) for item in schema]
        else:
            return schema
    
    def _clean_schema_for_gemini(self, schema: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove fields that Gemini doesn't support.
        Gemini supports: type, properties, required, items, enum, description.
        Does NOT support: anyOf, allOf, oneOf, $ref, title, additionalProperties, etc.
        
        For anyOf, we'll just use the first option (usually the most permissive).
        For objects with additionalProperties but no properties, don't include properties key.
        """
        if isinstance(schema, dict):
            # Handle anyOf by taking the first option
            if "anyOf" in schema:
                # Take the first option and continue cleaning it
                first_option = schema["anyOf"][0] if schema["anyOf"] else {}
                return self._clean_schema_for_gemini(first_option)
            
            # Fields to keep
            allowed_fields = {"type", "properties", "required", "items", "enum", "description"}
            
            # Clean this level
            cleaned = {}
            for key, value in schema.items():
                if key in allowed_fields:
                    if key == "properties" and isinstance(value, dict):
                        # Special handling for properties - keep all property definitions
                        cleaned_props = {
                            prop_name: self._clean_schema_for_gemini(prop_value)
                            for prop_name, prop_value in value.items()
                        }
                        # Only include properties if non-empty
                        if cleaned_props:
                            cleaned[key] = cleaned_props
                    else:
                        # Recursively clean nested schemas
                        cleaned[key] = self._clean_schema_for_gemini(value)
            
            # Handle objects with no properties (like additionalProperties=true)
            # Gemini needs either properties or no properties key at all
            if cleaned.get("type") == "object" and "properties" in cleaned and not cleaned["properties"]:
                # Remove empty properties for generic objects
                del cleaned["properties"]
                if "required" in cleaned:
                    del cleaned["required"]  # Can't require fields if no properties defined
            
            return cleaned
        elif isinstance(schema, list):
            return [self._clean_schema_for_gemini(item) for item in schema]
        else:
            return schema
    
    def _extract_json(self, text: str) -> Dict[str, Any]:
        """
        Extract JSON from LLM response.
        Handles cases where JSON is wrapped in markdown code blocks or has malformed strings.
        """
        text = text.strip()
        
        # Try direct JSON parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            tool_logger.debug(f"Direct JSON parse failed: {e}. Trying alternative methods...")
        
        # Look for JSON in markdown code blocks
        if "```json" in text:
            start = text.find("```json") + 7
            end = text.find("```", start)
            json_str = text[start:end].strip()
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # Look for any code block
        if "```" in text:
            start = text.find("```") + 3
            # Skip language identifier if present
            newline = text.find("\n", start)
            if newline != -1 and newline < start + 20:
                start = newline + 1
            end = text.find("```", start)
            json_str = text[start:end].strip()
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass
        
        # Try to find JSON object boundaries
        start = text.find("{")
        end = text.rfind("}") + 1
        
        if start != -1 and end > start:
            json_str = text[start:end]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError as e:
                # Try to fix common JSON issues
                tool_logger.debug(f"JSON parsing failed at position {e.pos}: {e.msg}")
                # Attempt to fix unterminated strings by finding and escaping quotes
                try:
                    # Simple fix: replace unescaped newlines in strings
                    import re
                    # This is a heuristic fix - may not work for all cases
                    fixed_json = re.sub(r'(?<!\\)\\n', '\\\\n', json_str)
                    fixed_json = re.sub(r'(?<!\\)\\t', '\\\\t', fixed_json)
                    return json.loads(fixed_json)
                except:
                    pass
        
        # Last resort: try parsing the whole thing
        raise json.JSONDecodeError(f"Could not extract valid JSON from response", text, 0)
    
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
