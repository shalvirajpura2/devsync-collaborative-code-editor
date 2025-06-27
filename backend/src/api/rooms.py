import json
from datetime import datetime, timezone
from bson import ObjectId, errors as bson_errors
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends, Body, Query
import pymongo

from src.db.mongodb import db
from src.models.room import (
    RoomCreate, RoomUpdate, CodeUpdate, ExecuteCode, 
    ShareRequest, ShareByEmailRequest
)
from src.services.websocket_manager import manager
from src.services.code_executor import execute_python_code
from src.core.firebase_auth import get_current_user
from firebase_admin import auth as firebase_auth

router = APIRouter()

@router.post("/api/rooms", status_code=201)
async def create_room(room_create: RoomCreate, user=Depends(get_current_user)):
    """Create a new room, owned by the authenticated user."""
    now = datetime.now(timezone.utc)
    room_data = {
        "name": room_create.name,
        "code": "# Welcome to the collaborative Python editor!\\nprint('Hello, World!')",
        "language": "python",
        "created_at": now,
        "last_activity": now,
        "owner": user["uid"],
        "shared_with": [],
    }
    result = await db.rooms.insert_one(room_data)
    return {"room_id": str(result.inserted_id), "message": "Room created successfully"}

@router.delete("/api/rooms/{room_id}", status_code=204)
async def delete_room(room_id: str, user=Depends(get_current_user)):
    """Delete a room. Only the owner can delete."""
    try:
        obj_id = ObjectId(room_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Room ID format.")
        
    room = await db.rooms.find_one({"_id": obj_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["owner"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the owner can delete this room")
    
    await db.rooms.delete_one({"_id": obj_id})
    return


@router.put("/api/rooms/{room_id}")
async def rename_room(room_id: str, room_update: RoomUpdate, user=Depends(get_current_user)):
    """Rename a room. Only the owner can rename."""
    try:
        obj_id = ObjectId(room_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Room ID format.")

    room = await db.rooms.find_one({"_id": obj_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["owner"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the owner can rename this room")
    
    update_data = room_update.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")

    result = await db.rooms.update_one(
        {"_id": obj_id},
        {"$set": update_data}
    )
    if result.modified_count == 1:
        return {"message": "Room renamed successfully"}
    raise HTTPException(status_code=400, detail="Could not rename room")

@router.get("/api/rooms/{room_id}")
async def get_room(room_id: str, user=Depends(get_current_user)):
    """Get room details if the user is the owner or shared_with."""
    try:
        obj_id = ObjectId(room_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Room ID format.")

    room = await db.rooms.find_one({"_id": obj_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["owner"] != user["uid"] and user["uid"] not in room.get("shared_with", []):
        raise HTTPException(status_code=403, detail="Not authorized to access this room")
    room["_id"] = str(room["_id"])
    return room

@router.get("/api/rooms")
async def list_rooms(
    user=Depends(get_current_user),
    owned: bool = Query(False),
    shared: bool = Query(False)
):
    """List rooms owned by or shared with the authenticated user, or filter by type."""
    query = None
    if owned:
        query = {"owner": user["uid"]}
    elif shared:
        query = {"shared_with": user["uid"]}
    else:
        query = {"$or": [
            {"owner": user["uid"]},
            {"shared_with": user["uid"]}
        ]}
    
    rooms_cursor = db.rooms.find(query).sort("created_at", pymongo.DESCENDING)
    rooms = []
    async for room in rooms_cursor:
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
            {"$set": {
                "code": code_update.code,
                "last_activity": datetime.now(timezone.utc)
            }}
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
        await db.rooms.update_one(
            {"_id": ObjectId(room_id)},
            {"$set": {"last_activity": datetime.now(timezone.utc)}}
        )
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
                    {"$set": {
                        "code": message["code"],
                        "last_activity": datetime.now(timezone.utc)
                    }}
                )
                await manager.broadcast_to_room(data, room_id, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)

@router.post("/api/rooms/{room_id}/share")
async def share_room(room_id: str, share_request: ShareRequest, user=Depends(get_current_user)):
    """Share a room with another user by UID. Only the owner can share."""
    share_with_uid = share_request.share_with_uid
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
    # Send real-time notification
    await manager.send_notification_to_user(
        share_with_uid,
        json.dumps({
            "type": "notification",
            "subtype": "room_shared",
            "room_id": room_id,
            "room_name": room["name"],
            "from_email": user["email"],
            "message": f"Room '{room['name']}' was shared with you by {user['email']}"
        })
    )
    return {"message": "Room shared successfully"}

@router.post("/api/rooms/{room_id}/share-by-email")
async def share_room_by_email(room_id: str, request: ShareByEmailRequest, user=Depends(get_current_user)):
    """Share a room with another user by email. Only the owner can share."""
    email = request.email
    if not email:
        raise HTTPException(status_code=400, detail="Missing email")
    try:
        target_user = firebase_auth.get_user_by_email(email)
    except firebase_auth.UserNotFoundError:
        raise HTTPException(status_code=404, detail="User with this email not found")
    share_with_uid = target_user.uid
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
    # Send real-time notification
    await manager.send_notification_to_user(
        share_with_uid,
        json.dumps({
            "type": "notification",
            "subtype": "room_shared",
            "room_id": room_id,
            "room_name": room["name"],
            "from_email": user["email"],
            "message": f"Room '{room['name']}' was shared with you by {user['email']}"
        })
    )
    return {"message": f"Room shared with {email} successfully"}

@router.get("/api/rooms/{room_id}/members")
async def get_room_members(room_id: str, user=Depends(get_current_user)):
    """Return a list of participants (owner and shared users) with their emails."""
    room = await db.rooms.find_one({"_id": ObjectId(room_id)})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["owner"] != user["uid"] and user["uid"] not in room.get("shared_with", []):
        raise HTTPException(status_code=403, detail="Not authorized to view members of this room")
    uids = [room["owner"]] + room.get("shared_with", [])
    members = []
    for uid in uids:
        try:
            firebase_user = firebase_auth.get_user(uid)
            members.append({
                "uid": uid,
                "email": firebase_user.email,
                "display_name": firebase_user.display_name
            })
        except Exception:
            members.append({"uid": uid, "email": None, "display_name": None})
    return {"members": members}

@router.post("/api/rooms/{room_id}/remove-user")
async def remove_user_from_room(room_id: str, payload: dict = Body(...), user=Depends(get_current_user)):
    """Remove a user's access from a room. Only the owner can remove."""
    remove_uid = payload.get("uid")
    if not remove_uid:
        raise HTTPException(status_code=400, detail="Missing user UID to remove.")
    try:
        obj_id = ObjectId(room_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid Room ID format.")
    room = await db.rooms.find_one({"_id": obj_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["owner"] != user["uid"]:
        raise HTTPException(status_code=403, detail="Only the owner can remove users from this room")
    if remove_uid not in room.get("shared_with", []):
        raise HTTPException(status_code=400, detail="User does not have access to this room")
    await db.rooms.update_one(
        {"_id": obj_id},
        {"$pull": {"shared_with": remove_uid}}
    )
    # Send real-time notification to the removed user
    await manager.send_notification_to_user(
        remove_uid,
        json.dumps({
            "type": "notification",
            "subtype": "removed_from_room",
            "room_id": room_id,
            "room_name": room["name"],
            "message": f"You have been removed from the room '{room['name']}' by the owner."
        })
    )
    return {"message": "User access removed from the room."} 