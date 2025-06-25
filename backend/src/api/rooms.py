import json
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Body

from src.db.mongodb import db
from src.models.room import Room, CodeUpdate, ExecuteCode
from src.services.websocket_manager import manager
from src.services.code_executor import execute_python_code
from src.core.firebase_auth import get_current_user

router = APIRouter()

@router.post("/api/rooms")
async def create_room(room: Room, user=Depends(get_current_user)):
    """Create a new room, owned by the authenticated user."""
    room_data = {
        "name": room.name,
        "code": room.code,
        "created_at": datetime.utcnow(),
        "owner": user["uid"],
        "shared_with": [],
        "users": []
    }
    result = await db.rooms.insert_one(room_data)
    return {"room_id": str(result.inserted_id), "message": "Room created successfully"}

@router.get("/api/rooms/{room_id}")
async def get_room(room_id: str, user=Depends(get_current_user)):
    """Get room details if the user is the owner or shared_with."""
    try:
        room = await db.rooms.find_one({"_id": ObjectId(room_id)})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["owner"] != user["uid"] and user["uid"] not in room.get("shared_with", []):
            raise HTTPException(status_code=403, detail="Not authorized to access this room")
        room["_id"] = str(room["_id"])
        return room
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")

@router.get("/api/rooms")
async def list_rooms(user=Depends(get_current_user)):
    """List all rooms owned by or shared with the authenticated user."""
    rooms = []
    async for room in db.rooms.find({
        "$or": [
            {"owner": user["uid"]},
            {"shared_with": user["uid"]}
        ]
    }):
        room["_id"] = str(room["_id"])
        rooms.append(room)
    return rooms

@router.put("/api/rooms/{room_id}/code")
async def update_code(room_id: str, code_update: CodeUpdate, user=Depends(get_current_user)):
    """Update code in a room if the user is the owner or shared_with."""
    try:
        room = await db.rooms.find_one({"_id": ObjectId(room_id)})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        if room["owner"] != user["uid"] and user["uid"] not in room.get("shared_with", []):
            raise HTTPException(status_code=403, detail="Not authorized to update this room")
        result = await db.rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"code": code_update.code}}
        )
        await manager.broadcast_to_room(
            json.dumps({"type": "code_update", "code": code_update.code}),
            room_id
        )
        return {"message": "Code updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")

@router.post("/api/rooms/{room_id}/execute")
async def execute_code_in_room(room_id: str, execute_request: ExecuteCode, user=Depends(get_current_user)):
    """Execute Python code and broadcast the result if the user is authorized."""
    try:
        room = await db.rooms.find_one({"_id": ObjectId(room_id)})
        if not room:
            return {"stdout": "", "stderr": "Room not found", "returncode": 1}
        if room["owner"] != user["uid"] and user["uid"] not in room.get("shared_with", []):
            return {"stdout": "", "stderr": "Not authorized to execute code in this room", "returncode": 1}
        output = await execute_python_code(execute_request.code)
        await manager.broadcast_to_room(
            json.dumps({"type": "execution_result", "output": output}),
            room_id
        )
        return output
    except Exception as e:
        return {"stdout": "", "stderr": f"Error: {str(e)}", "returncode": 1}

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    # WebSocket authentication is not implemented here, but can be added for extra security
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message["type"] == "code_update":
                await db.rooms.update_one(
                    {"_id": ObjectId(room_id)},
                    {"$set": {"code": message["code"]}}
                )
                await manager.broadcast_to_room(data, room_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

@router.post("/api/rooms/{room_id}/share")
async def share_room(room_id: str, data=Body(...), user=Depends(get_current_user)):
    """Share a room with another user by UID. Only the owner can share."""
    share_with_uid = data.get("share_with_uid")
    if not share_with_uid:
        raise HTTPException(status_code=400, detail="Missing share_with_uid")
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["owner"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the owner can share this room")
    if share_with_uid == user["uid"]:
        raise HTTPException(status_code=400, detail="Cannot share with yourself")
    if share_with_uid in room.get("shared_with", []):
        return {"message": "User already has access"}
    await db.rooms.update_one(
        {"_id": ObjectId(room_id)},
        {"$addToSet": {"shared_with": share_with_uid}}
    )
    return {"message": "Room shared successfully"} 