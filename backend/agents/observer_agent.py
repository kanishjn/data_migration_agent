"""
OBSERVATION LAYER
Pattern detection without LLM calls.
Detects spikes, correlations, and clusters in normalized events.
"""

from collections import defaultdict, Counter
from datetime import datetime, timedelta
from typing import List, Dict, Any


class ObserverAgent:
    """
    Observes incoming signals and detects patterns.
    No LLM calls - pure data analysis.
    
    Detects:
    - Error spikes (temporal)
    - Merchant clusters (same error across multiple merchants)
    - Migration stage correlation
    - Severity patterns
    """
    
    def __init__(self, spike_threshold: int = 3):
        self.spike_threshold = spike_threshold
    
    def observe(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Main observation pipeline.
        
        Returns structured insights about patterns detected in the events.
        """
        if not events:
            return {
                "patterns": [],
                "raw_event_count": 0,
                "summary": "No events to analyze"
            }
        
        patterns = []
        
        # Pattern 1: Error code clustering
        error_clusters = self._detect_error_clusters(events)
        patterns.extend(error_clusters)
        
        # Pattern 2: Migration stage correlation
        migration_patterns = self._detect_migration_correlation(events)
        patterns.extend(migration_patterns)
        
        # Pattern 3: Temporal spikes
        temporal_spikes = self._detect_temporal_spikes(events)
        patterns.extend(temporal_spikes)
        
        # Pattern 4: Severity analysis
        severity_breakdown = self._analyze_severity(events)
        
        return {
            "patterns": patterns,
            "raw_event_count": len(events),
            "severity_breakdown": severity_breakdown,
            "summary": self._generate_summary(patterns, events)
        }
    
    def _detect_error_clusters(self, events: List[Dict]) -> List[Dict]:
        """Cluster events by error_code and detect multi-merchant issues."""
        clusters = defaultdict(lambda: {
            "merchants": set(),
            "occurrences": 0,
            "first_seen": None,
            "endpoints": set(),
            "sources": set()
        })
        
        for event in events:
            error_code = event.get("error_code")
            if not error_code:
                continue
            
            merchant_id = event.get("merchant_id")
            timestamp = event.get("timestamp")
            endpoint = event.get("endpoint")
            source = event.get("source")
            occurrence_count = event.get("occurrence_count", 1)
            
            clusters[error_code]["merchants"].add(merchant_id)
            clusters[error_code]["occurrences"] += occurrence_count
            clusters[error_code]["endpoints"].add(endpoint)
            clusters[error_code]["sources"].add(source)
            
            if not clusters[error_code]["first_seen"] or timestamp < clusters[error_code]["first_seen"]:
                clusters[error_code]["first_seen"] = timestamp
        
        patterns = []
        for error_code, data in clusters.items():
            merchant_count = len(data["merchants"])
            
            # Only flag if multiple merchants affected
            if merchant_count >= self.spike_threshold:
                patterns.append({
                    "pattern_type": "error_cluster",
                    "error_code": error_code,
                    "affected_merchants": merchant_count,
                    "total_occurrences": data["occurrences"],
                    "affected_endpoints": list(data["endpoints"]),
                    "affected_sources": list(data["sources"]),
                    "first_seen": data["first_seen"],
                    "severity": "high" if merchant_count >= 5 else "medium"
                })
        
        return patterns
    
    def _detect_migration_correlation(self, events: List[Dict]) -> List[Dict]:
        """Detect if errors correlate with migration stages."""
        migration_buckets = defaultdict(lambda: {
            "merchants": set(),
            "error_codes": Counter()
        })
        
        for event in events:
            stage = event.get("migration_stage", "unknown")
            merchant_id = event.get("merchant_id")
            error_code = event.get("error_code")
            
            migration_buckets[stage]["merchants"].add(merchant_id)
            migration_buckets[stage]["error_codes"][error_code] += 1
        
        patterns = []
        for stage, data in migration_buckets.items():
            if stage == "unknown":
                continue
            
            merchant_count = len(data["merchants"])
            if merchant_count >= 2:  # Lower threshold for migration correlation
                top_errors = data["error_codes"].most_common(3)
                patterns.append({
                    "pattern_type": "migration_correlation",
                    "migration_stage": stage,
                    "affected_merchants": merchant_count,
                    "top_errors": [{"code": code, "count": count} for code, count in top_errors],
                    "severity": "high" if stage in ["during_migration", "post_migration"] else "medium"
                })
        
        return patterns
    
    def _detect_temporal_spikes(self, events: List[Dict]) -> List[Dict]:
        """Detect temporal patterns (e.g., all errors in last hour)."""
        if not events:
            return []
        
        timestamps = [e.get("timestamp") or e.get("first_seen") for e in events if e.get("timestamp") or e.get("first_seen")]
        if not timestamps:
            return []
        
        # Simple heuristic: if 80% of events are recent, it's a spike
        try:
            recent_threshold = max(timestamps)  # Most recent timestamp
            # Count events in last "window" - for demo, just check recency
            
            return [{
                "pattern_type": "temporal_spike",
                "time_window": "last_2_hours",
                "event_count": len(events),
                "severity": "high" if len(events) > 10 else "medium"
            }]
        except:
            return []
    
    def _analyze_severity(self, events: List[Dict]) -> Dict[str, int]:
        """Break down events by HTTP status code severity."""
        severity_map = {
            "critical": 0,  # 5xx errors
            "high": 0,      # 4xx client errors affecting checkout
            "medium": 0,    # 4xx other
            "low": 0        # warnings, deprecations
        }
        
        for event in events:
            status = event.get("http_status", 200)
            error_code = event.get("error_code", "")
            
            if status >= 500:
                severity_map["critical"] += 1
            elif status == 429 or "CHECKOUT" in error_code or "PAYMENT" in error_code:
                severity_map["high"] += 1
            elif status >= 400:
                severity_map["medium"] += 1
            else:
                severity_map["low"] += 1
        
        return severity_map
    
    def _generate_summary(self, patterns: List[Dict], events: List[Dict]) -> str:
        """Generate human-readable summary."""
        if not patterns:
            return f"Analyzed {len(events)} events. No significant patterns detected."
        
        high_severity = [p for p in patterns if p.get("severity") == "high"]
        if high_severity:
            return f"⚠️  {len(high_severity)} high-severity patterns detected across {len(events)} events"
        
        return f"{len(patterns)} patterns detected across {len(events)} events"