import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from .presence import presence_manager
from .bus import RealtimeEventBus
from .metrics import metrics_manager

logger = logging.getLogger(__name__)

class MainConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get("user")
        self.session_id = self.channel_name
        
        if not self.user or self.user.is_anonymous:
            await self.close()
            return

        # Track connection metrics
        metrics_manager.track_connection()

        # Join Groups
        self.personal_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(self.personal_group, self.channel_name)
        self.global_group = "global"
        await self.channel_layer.group_add(self.global_group, self.channel_name)
        
        self.record_groups = set()
        await self.accept()
        
        # Initial presence update
        presence_manager.heartbeat(self.user.id, self.session_id)
        await self.broadcast_presence_change()

    async def disconnect(self, close_code):
        metrics_manager.track_disconnection()
        presence_manager.remove_session(self.user.id, self.session_id)
        
        if hasattr(self, 'personal_group'):
            await self.channel_layer.group_discard(self.personal_group, self.channel_name)
        if hasattr(self, 'global_group'):
            await self.channel_layer.group_discard(self.global_group, self.channel_name)
        
        for group in self.record_groups:
            await self.channel_layer.group_discard(group, self.channel_name)
            parts = group.split('_')
            if len(parts) == 3:
                await self.broadcast_record_viewers(parts[1], parts[2])
        
        await self.broadcast_presence_change()

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            action = data.get("action")
            metrics_manager.track_event(f"ws_in:{action}")

            # Rate Limiting
            if action in ["typing_start", "typing_stop"]:
                if metrics_manager.is_rate_limited(self.user.id, "typing", rate=2, burst=5):
                    await self.send_error("Rate limit exceeded for typing events", "RATE_LIMIT")
                    return
            elif action == "heartbeat":
                if metrics_manager.is_rate_limited(self.user.id, "heartbeat", rate=0.2, burst=2): # Max 1 per 5s
                    return # Silently drop extra heartbeats
            
            if action == "heartbeat":
                status = data.get("status", "online")
                record_type = data.get("record_type")
                record_id = data.get("record_id")
                presence_manager.heartbeat(self.user.id, self.session_id, status, record_type, record_id)
            
            elif action == "subscribe_record":
                record_type = data.get("record_type")
                record_id = data.get("record_id")
                if record_type and record_id:
                    group_name = f"record_{record_type}_{record_id}"
                    await self.channel_layer.group_add(group_name, self.channel_name)
                    self.record_groups.add(group_name)
                    await self.broadcast_record_viewers(record_type, record_id)

            elif action == "catch_up":
                last_event_id = data.get("last_event_id")
                group = data.get("group", self.global_group)
                if last_event_id:
                    missed = RealtimeEventBus.get_catchup_events(group, last_event_id)
                    for event in missed:
                        await self.send(text_data=json.dumps({
                            "event": event["event"],
                            "payload": event["payload"],
                            "event_id": event["event_id"],
                            "timestamp": event["timestamp"],
                            "is_replay": True
                        }))

            elif action == "typing_start":
                record_type = data.get("record_type")
                record_id = data.get("record_id")
                if record_type and record_id:
                    await self.channel_layer.group_send(
                        f"record_{record_type}_{record_id}",
                        {
                            "type": "broadcast_message",
                            "event": "typing.started",
                            "payload": {"user_id": self.user.id, "username": self.user.username}
                        }
                    )

            elif action == "typing_stop":
                record_type = data.get("record_type")
                record_id = data.get("record_id")
                if record_type and record_id:
                    await self.channel_layer.group_send(
                        f"record_{record_type}_{record_id}",
                        {
                            "type": "broadcast_message",
                            "event": "typing.stopped",
                            "payload": {"user_id": self.user.id}
                        }
                    )
        except Exception as e:
            metrics_manager.track_error("ws_receive", "EXCEPTION")
            logger.error(f"Error in WebSocket receive: {str(e)}")

    async def broadcast_presence_change(self):
        presence = presence_manager.get_user_presence(self.user.id)
        await self.channel_layer.group_send(
            "global",
            {
                "type": "broadcast_message",
                "event": "presence.updated",
                "payload": {"user_id": self.user.id, **presence}
            }
        )

    async def broadcast_record_viewers(self, record_type, record_id):
        viewers = presence_manager.get_record_viewers(record_type, record_id)
        await self.channel_layer.group_send(
            f"record_{record_type}_{record_id}",
            {
                "type": "broadcast_message",
                "event": "record.viewers_updated",
                "payload": {"viewers": viewers}
            }
        )

    async def broadcast_message(self, event):
        await self.send(text_data=json.dumps({
            "event": event["event"],
            "payload": event["payload"],
            "event_id": event.get("event_id"),
            "timestamp": event.get("timestamp")
        }))

    async def send_error(self, message, code):
        await self.send(text_data=json.dumps({
            "event": "system.error",
            "payload": {"message": message, "code": code}
        }))
