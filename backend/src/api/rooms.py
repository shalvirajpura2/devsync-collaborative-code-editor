import json
from datetime import datetime
from bson import ObjectId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException

from src.db.mongodb import db
from src.models.room import Room, CodeUpdate, ExecuteCode
from src.services.websocket_manager import manager
from src.services.code_executor import execute_python_code

router = APIRouter()

@router.post("/api/rooms")
async def create_room(room: Room):
    """Create a new room"""
    room_data = {
        "name": room.name,
        "code": room.code,
        "created_at": datetime.utcnow(),
        "users": []
    }
    result = await db.rooms.insert_one(room_data)
    return {"room_id": str(result.inserted_id), "message": "Room created successfully"}

@router.get("/api/rooms/{room_id}")
async def get_room(room_id: str):
    """Get room details"""
    try:
        room = await db.rooms.find_one({"_id": ObjectId(room_id)})
        if not room:
            raise HTTPException(status_code=404, detail="Room not found")
        
        room["_id"] = str(room["_id"])
        return room
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")

@router.get("/api/rooms")
async def list_rooms():
    """List all rooms"""
    rooms = []
    async for room in db.rooms.find():
        room["_id"] = str(room["_id"])
        rooms.append(room)
    return rooms

@router.put("/api/rooms/{room_id}/code")
async def update_code(room_id: str, code_update: CodeUpdate):
    """Update code in a room"""
    try:
        result = await db.rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"code": code_update.code}}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Room not found")
        
        await manager.broadcast_to_room(
            json.dumps({"type": "code_update", "code": code_update.code}),
            room_id
        )
        
        return {"message": "Code updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid room ID")

@router.post("/api/rooms/{room_id}/execute")
async def execute_code_in_room(room_id: str, execute_request: ExecuteCode):
    """Execute Python code and broadcast the result."""
    try:
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