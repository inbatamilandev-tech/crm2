import json
import time
from django.conf import settings
from .redis_fallback import get_safe_redis_connection

# Presence timeouts
PRESENCE_TIMEOUT = 60  # Seconds until user is considered offline
HEARTBEAT_INTERVAL = 30 # Expected heartbeat every 30s
LAST_SEEN_PERSISTENCE = 86400 * 7 # 7 days

class PresenceManager:
    """
    Handles live presence tracking using Redis.
    Stores user status, active sessions, and record-level viewers.
    """
    
    def __init__(self):
        self.redis = get_safe_redis_connection("default")

    def heartbeat(self, user_id, session_id, status='online', record_type=None, record_id=None):
        """
        Updates the heartbeat for a specific session.
        """
        now = time.time()
        
        # 1. Update User Global Presence (Ephemeral)
        user_key = f"presence:user:{user_id}"
        session_data = {
            "status": status,
            "last_seen": now,
            "record": f"{record_type}:{record_id}" if record_type and record_id else None
        }
        self.redis.hset(user_key, session_id, json.dumps(session_data))
        self.redis.expire(user_key, PRESENCE_TIMEOUT + 10)

        # 2. Update Record Viewers (Ephemeral)
        if record_type and record_id:
            record_key = f"presence:record:{record_type}:{record_id}"
            self.redis.hset(record_key, user_id, now)
            self.redis.expire(record_key, PRESENCE_TIMEOUT + 10)

        # 3. Update Persistent Last Seen
        last_seen_key = f"presence:last_seen:{user_id}"
        self.redis.set(last_seen_key, now)
        self.redis.expire(last_seen_key, LAST_SEEN_PERSISTENCE)

    def remove_session(self, user_id, session_id):
        """
        Removes a session (e.g. on disconnect).
        """
        user_key = f"presence:user:{user_id}"
        self.redis.hdel(user_key, session_id)

    def get_user_presence(self, user_id):
        """
        Aggregates presence across all sessions for a user.
        """
        user_key = f"presence:user:{user_id}"
        sessions = self.redis.hgetall(user_key)
        
        if not sessions:
            # Check persistent last seen
            last_seen = self.redis.get(f"presence:last_seen:{user_id}")
            return {
                "status": "offline", 
                "last_seen": float(last_seen) if last_seen else None
            }
            
        now = time.time()
        active_sessions = []
        highest_status = "offline"
        latest_seen = 0
        
        for sid, data in sessions.items():
            s_data = json.loads(data)
            if now - s_data['last_seen'] < PRESENCE_TIMEOUT:
                active_sessions.append(s_data)
                latest_seen = max(latest_seen, s_data['last_seen'])
                # Status priority: online > dnd > away > idle
                status = s_data['status']
                if status == 'online': highest_status = 'online'
                elif status == 'dnd' and highest_status not in ['online']: highest_status = 'dnd'
                elif status == 'away' and highest_status not in ['online', 'dnd']: highest_status = 'away'
                elif status == 'idle' and highest_status not in ['online', 'dnd', 'away']: highest_status = 'idle'
            else:
                self.redis.hdel(user_key, sid)

        if not active_sessions:
            return {"status": "offline", "last_seen": latest_seen or None}

        return {
            "status": highest_status,
            "last_seen": latest_seen,
            "sessions_count": len(active_sessions)
        }

    def cleanup_stale_sessions(self):
        """
        Scans and purges all stale session data across all users.
        Best used in a periodic background task.
        """
        now = time.time()
        cursor = 0
        cleaned_count = 0
        
        while True:
            cursor, keys = self.redis.scan(cursor=cursor, match="presence:user:*", count=100)
            for user_key in keys:
                sessions = self.redis.hgetall(user_key)
                for sid, data in sessions.items():
                    s_data = json.loads(data)
                    if now - s_data['last_seen'] > PRESENCE_TIMEOUT:
                        self.redis.hdel(user_key, sid)
                        cleaned_count += 1
            if cursor == 0:
                break
        return cleaned_count

    def get_record_viewers(self, record_type, record_id):
        """
        Returns list of user IDs currently viewing a record.
        """
        record_key = f"presence:record:{record_type}:{record_id}"
        viewers = self.redis.hgetall(record_key)
        now = time.time()
        active_viewers = []
        
        for user_id, last_seen in viewers.items():
            if now - float(last_seen) < PRESENCE_TIMEOUT:
                active_viewers.append(user_id.decode())
            else:
                self.redis.hdel(record_key, user_id)
                
        return active_viewers

presence_manager = PresenceManager()
