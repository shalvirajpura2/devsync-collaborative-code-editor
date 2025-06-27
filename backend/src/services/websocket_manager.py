from typing import Dict, List
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}  # room_id -> [WebSocket]
        self.user_connections: Dict[str, List[WebSocket]] = {}    # user_uid -> [WebSocket]
        self.ws_to_user: Dict[WebSocket, str] = {}                # WebSocket -> user_uid

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        # Wait for auth message to get user_uid
        try:
            auth_data = await websocket.receive_text()
            auth_msg = json.loads(auth_data)
            if auth_msg.get('type') == 'auth' and 'user_uid' in auth_msg:
                user_uid = auth_msg['user_uid']
                self.ws_to_user[websocket] = user_uid
                if user_uid not in self.user_connections:
                    self.user_connections[user_uid] = []
                self.user_connections[user_uid].append(websocket)
        except Exception:
            pass

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]:
                del self.active_connections[room_id]
        user_uid = self.ws_to_user.pop(websocket, None)
        if user_uid and user_uid in self.user_connections:
            self.user_connections[user_uid].remove(websocket)
            if not self.user_connections[user_uid]:
                del self.user_connections[user_uid]

    async def broadcast_to_room(self, message: str, room_id: str, sender: WebSocket = None):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection != sender:
                    try:
                        await connection.send_text(message)
                    except:
                        self.active_connections[room_id].remove(connection)

    async def send_notification_to_user(self, user_uid: str, message: str):
        if user_uid in self.user_connections:
            for ws in self.user_connections[user_uid]:
                try:
                    await ws.send_text(message)
                except:
                    pass

manager = ConnectionManager() 