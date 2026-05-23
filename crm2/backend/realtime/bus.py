import logging
import uuid
import time
import json
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django_redis import get_redis_connection

logger = logging.getLogger(__name__)

class RealtimeEventBus:
    """
    Centralized utility to broadcast events into the CRM's realtime nervous system.
    Supports segmenting by user, team, record, or global scope.
    Includes EventBuffer for disconnect recovery.
    """
    
    @staticmethod
    def broadcast(event_type, payload, user_id=None, team_id=None, record_type=None, record_id=None):
        """
        Broadcasts an event and buffers it in Redis for catch-up.
        """
        channel_layer = get_channel_layer()
        event_id = str(uuid.uuid4())
        timestamp = time.time()
        
        message = {
            "type": "broadcast_message",
            "event": event_type,
            "payload": payload,
            "event_id": event_id,
            "timestamp": timestamp
        }

        groups = []
        if user_id: groups.append(f"user_{user_id}")
        if team_id: groups.append(f"team_{team_id}")
        if record_type and record_id: groups.append(f"record_{record_type}_{record_id}")
        if not groups: groups.append("global")

        # Buffer event in Redis
        redis = get_redis_connection("default")
        for group in groups:
            buffer_key = f"rt:buffer:{group}"
            redis.lpush(buffer_key, json.dumps(message))
            redis.ltrim(buffer_key, 0, 49) # Keep last 50 events
            redis.expire(buffer_key, 3600) # 1 hour TTL

            try:
                async_to_sync(channel_layer.group_send)(group, message)
            except Exception as e:
                logger.error(f"Failed to broadcast to group {group}: {str(e)}")
        
        return event_id

    @staticmethod
    def get_catchup_events(group, last_event_id):
        """
        Retrieves missed events since last_event_id for a given group.
        """
        redis = get_redis_connection("default")
        buffer_key = f"rt:buffer:{group}"
        events = redis.lrange(buffer_key, 0, -1)
        
        catchup = []
        for event_json in events:
            event = json.loads(event_json)
            if event["event_id"] == last_event_id:
                break
            catchup.append(event)
            
        return list(reversed(catchup)) # Return in chronological order

# Shorthand instances
def emit_notification(user_id, notification_data):
    return RealtimeEventBus.broadcast("notification.created", notification_data, user_id=user_id)

def emit_comment(record_type, record_id, comment_data):
    return RealtimeEventBus.broadcast("comment.created", comment_data, record_type=record_type, record_id=record_id)

def emit_activity(activity_data):
    return RealtimeEventBus.broadcast("activity.created", activity_data)
