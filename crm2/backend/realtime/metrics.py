import time
import json
from .redis_fallback import get_safe_redis_connection

class RealtimeMetricsManager:
    """
    Handles connection metrics and multi-bucket rate limiting for WebSocket events.
    """
    def __init__(self):
        self.redis = get_safe_redis_connection("default")
        self.metrics_prefix = "rt:metrics:"
        self.limiter_prefix = "rt:limiter:"

    def track_connection(self):
        self.redis.incr(f"{self.metrics_prefix}active_connections")
        self.redis.incr(f"{self.metrics_prefix}total_connections")

    def track_disconnection(self):
        self.redis.decr(f"{self.metrics_prefix}active_connections")

    def track_event(self, event_type):
        """Tracks throughput and event-specific counts."""
        self.redis.hincrby(f"{self.metrics_prefix}event_counts", event_type, 1)
        # 1-minute throughput window
        ts_window = int(time.time() / 60)
        self.redis.incr(f"{self.metrics_prefix}throughput:{ts_window}")
        self.redis.expire(f"{self.metrics_prefix}throughput:{ts_window}", 3600)

    def track_error(self, event_type, error_code):
        self.redis.hincrby(f"{self.metrics_prefix}errors", f"{event_type}:{error_code}", 1)

    def is_rate_limited(self, user_id, bucket_name, rate=5, burst=10):
        """
        Token bucket rate limiting per user/bucket.
        rate: tokens added per second
        burst: max tokens in bucket
        """
        key = f"{self.limiter_prefix}{bucket_name}:{user_id}"
        now = time.time()
        
        # Get current bucket state
        state = self.redis.get(key)
        if state:
            tokens, last_update = json.loads(state)
            # Refill tokens based on time passed
            elapsed = now - last_update
            tokens = min(burst, tokens + (elapsed * rate))
        else:
            tokens = burst
            
        if tokens >= 1:
            tokens -= 1
            self.redis.setex(key, 60, json.dumps([tokens, now]))
            return False
        return True

    def get_metrics(self):
        """Returns snapshot of current metrics."""
        active = self.redis.get(f"{self.metrics_prefix}active_connections")
        total = self.redis.get(f"{self.metrics_prefix}total_connections")
        event_counts = self.redis.hgetall(f"{self.metrics_prefix}event_counts")
        errors = self.redis.hgetall(f"{self.metrics_prefix}errors")
        
        # Parse throughput for last 5 minutes
        now_window = int(time.time() / 60)
        throughput = {}
        for i in range(5):
            win = now_window - i
            val = self.redis.get(f"{self.metrics_prefix}throughput:{win}")
            throughput[win] = int(val) if val else 0
            
        return {
            "active_connections": int(active) if active else 0,
            "total_connections": int(total) if total else 0,
            "event_counts": {k.decode(): int(v) for k, v in event_counts.items()},
            "errors": {k.decode(): int(v) for k, v in errors.items()},
            "throughput": throughput
        }

metrics_manager = RealtimeMetricsManager()
