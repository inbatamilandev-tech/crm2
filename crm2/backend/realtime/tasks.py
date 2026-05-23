from celery import shared_task
import time
from .presence import presence_manager
from django_redis import get_redis_connection

@shared_task
def purge_zombie_sessions():
    """
    Periodic task to clean up presence data that didn't expire correctly.
    """
    cleaned = presence_manager.cleanup_stale_sessions()
    return f"Cleaned up {cleaned} zombie sessions."

@shared_task
def maintenance_realtime_buffers():
    """
    Cleanup old event buffers and metrics.
    """
    redis = get_redis_connection("default")
    cursor = 0
    purged_buffers = 0
    
    # Clean up buffers with no TTL (safety check)
    while True:
        cursor, keys = redis.scan(cursor=cursor, match="rt:buffer:*", count=100)
        for key in keys:
            if redis.ttl(key) == -1:
                redis.expire(key, 3600)
                purged_buffers += 1
        if cursor == 0:
            break
            
    return f"Maintained {purged_buffers} buffers."
