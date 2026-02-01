"""
Retrieval Layer (RAG) - Grounds LLM responses with relevant documentation.

Searches known issues, migration docs, and past incidents before LLM calls
to reduce hallucinations and improve answer quality.
"""

from typing import Any, Optional
import re


# Known issues corpus (from orchestrator context - can be extended via config)
DEFAULT_KNOWN_ISSUES = [
    {
        "issue": "Webhook endpoint v2 deprecated",
        "affected_versions": ["v2"],
        "resolution": "Update to v3 endpoint",
        "doc_url": "https://docs.platform.com/webhooks/migration",
        "error_codes": ["WEBHOOK_ENDPOINT_NOT_FOUND", "404"],
    },
    {
        "issue": "Headless checkout requires HTTPS callbacks",
        "affected_feature": "headless_checkout",
        "resolution": "Update callback URLs to use HTTPS",
        "doc_url": "https://docs.platform.com/checkout/headless",
        "error_codes": ["PAYMENT_CALLBACK_INVALID", "CHECKOUT_502"],
    },
    {
        "issue": "API tokens v2 incompatible with v3 endpoints",
        "affected_versions": ["v2", "v3"],
        "resolution": "Regenerate API tokens in dashboard",
        "doc_url": "https://docs.platform.com/auth/migration",
        "error_codes": ["AUTH_TOKEN_VERSION_MISMATCH", "401"],
    },
    {
        "issue": "Checkout session timeout changed (30min -> 15min)",
        "affected_feature": "headless_checkout",
        "resolution": "Inform merchants of shorter session window",
        "doc_url": "https://docs.platform.com/checkout/sessions",
        "error_codes": ["CHECKOUT_SESSION_EXPIRED", "410"],
    },
]


def search_relevant_docs(
    query: str,
    error_codes: Optional[list[str]] = None,
    pattern_type: Optional[str] = None,
    top_k: int = 3,
    corpus: Optional[list[dict]] = None,
) -> list[dict[str, Any]]:
    """
    Search for relevant documentation given a query and context.

    Uses simple keyword/error-code matching. Can be extended with embeddings.

    Args:
        query: Search query (e.g., pattern summary or error description)
        error_codes: List of error codes to match
        pattern_type: Type of pattern detected
        top_k: Maximum number of results
        corpus: Optional custom corpus (defaults to known issues)

    Returns:
        List of relevant doc snippets with issue, resolution, doc_url
    """
    corpus = corpus or DEFAULT_KNOWN_ISSUES
    scored: list[tuple[float, dict]] = []

    query_lower = query.lower() if query else ""
    error_codes = error_codes or []
    error_set = {ec.upper() for ec in error_codes}

    for doc in corpus:
        score = 0.0
        issue = doc.get("issue", "")
        resolution = doc.get("resolution", "")
        doc_errors = doc.get("error_codes", [])

        # Match by error code
        for ec in doc_errors:
            if ec.upper() in error_set or (error_set and ec.upper() in str(error_set)):
                score += 2.0
            if query and ec.upper() in query.upper():
                score += 1.5

        # Match by query keywords
        if query:
            for word in re.findall(r"\w+", query_lower):
                if len(word) > 3:
                    if word in issue.lower():
                        score += 1.0
                    if word in resolution.lower():
                        score += 0.5

        if score > 0:
            scored.append((score, doc))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]


def format_docs_for_prompt(docs: list[dict]) -> str:
    """Format retrieved docs for inclusion in LLM prompt."""
    if not docs:
        return ""

    lines = ["Relevant documentation:"]
    for i, doc in enumerate(docs, 1):
        lines.append(f"\n{i}. {doc.get('issue', 'N/A')}")
        lines.append(f"   Resolution: {doc.get('resolution', 'N/A')}")
        if doc.get("doc_url"):
            lines.append(f"   Doc: {doc['doc_url']}")
    return "\n".join(lines)


def get_grounding_context(
    observation: dict[str, Any],
    top_k: int = 3,
) -> str:
    """
    Build grounding context for reasoning/decision agents.

    Extracts error codes and pattern info from observation, searches docs,
    and returns formatted string for prompt injection.
    """
    try:
        from config import get
        if not get("retrieval.enabled", True):
            return ""
        top_k = get("retrieval.top_k", top_k)
    except ImportError:
        pass

    error_codes = []
    query_parts = []

    for pattern in observation.get("patterns", []):
        if pattern.get("error_code"):
            error_codes.append(pattern["error_code"])
        query_parts.append(pattern.get("pattern_type", ""))
        query_parts.append(pattern.get("error_code", ""))

    query = " ".join(filter(None, query_parts)) or observation.get("summary", "")

    docs = search_relevant_docs(
        query=query,
        error_codes=error_codes if error_codes else None,
        top_k=top_k,
    )

    return format_docs_for_prompt(docs)
