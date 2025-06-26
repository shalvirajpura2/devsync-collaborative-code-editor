from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId, errors as bson_errors
from typing import List
from datetime import datetime, timezone
import json

from src.db.mongodb import db
from src.core.firebase_auth import get_current_user
from src.models.room import JoinRequest
from src.services.websocket_manager import manager

router = APIRouter()

@router.post("/api/requests/join", status_code=201)
async def request_to_join_room(room_id: str, user=Depends(get_current_user)):
    """Creates a request for the current user to join a room."""
    try:
        room_obj_id = ObjectId(room_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Room ID format.")

    room = await db.rooms.find_one({"_id": room_obj_id})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")

    requester_uid = user["uid"]
    owner_uid = room["owner"]

    if requester_uid == owner_uid or requester_uid in room.get("shared_with", []):
        raise HTTPException(status_code=400, detail="You already have access to this room.")

    # Check for existing pending request
    existing_request = await db.join_requests.find_one({
        "room_id": room_id,
        "requester_uid": requester_uid,
        "status": "pending"
    })
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have a pending request for this room.")

    new_request = JoinRequest(
        room_id=room_id,
        requester_uid=requester_uid,
        requester_email=user["email"],
        owner_uid=owner_uid
    )

    result = await db.join_requests.insert_one(new_request.model_dump())
    request_id = str(result.inserted_id)
    # Send real-time notification to owner with request_id
    await manager.send_notification_to_user(
        owner_uid,
        json.dumps({
            "type": "notification",
            "subtype": "join_request",
            "room_id": room_id,
            "room_name": room["name"],
            "requester_email": user["email"],
            "requester_uid": requester_uid,
            "request_id": request_id,
            "message": f"{user['email']} requested to join '{room['name']}'"
        })
    )
    return {"message": "Your request to join has been sent to the room owner."}


@router.get("/api/requests/pending", response_model=List[dict])
async def get_pending_requests(user=Depends(get_current_user)):
    """Gets all pending join requests for rooms owned by the current user."""
    owner_uid = user["uid"]
    requests_cursor = db.join_requests.find({"owner_uid": owner_uid, "status": "pending"})
    
    pending_requests = []
    async for req in requests_cursor:
        room = await db.rooms.find_one({"_id": ObjectId(req["room_id"])})
        request_info = {
            "request_id": str(req["_id"]),
            "room_id": req["room_id"],
            "room_name": room["name"] if room else "Unknown Room",
            "requester_email": req["requester_email"],
            "requester_uid": req["requester_uid"],
            "owner_uid": req["owner_uid"],
            "created_at": req["created_at"]
        }
        pending_requests.append(request_info)
        
    return pending_requests


@router.post("/api/requests/{request_id}/approve")
async def approve_join_request(request_id: str, user=Depends(get_current_user)):
    """Approves a join request. Must be the room owner."""
    try:
        req_obj_id = ObjectId(request_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid request ID.")

    request = await db.join_requests.find_one({"_id": req_obj_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found.")

    if request["owner_uid"] != user["uid"]:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this request.")

    # Add user to the room's shared_with list
    await db.rooms.update_one(
        {"_id": ObjectId(request["room_id"])},
        {"$addToSet": {"shared_with": request["requester_uid"]}}
    )

    # Update the request status
    await db.join_requests.update_one(
        {"_id": req_obj_id},
        {"$set": {"status": "approved"}}
    )

    # Send real-time notification to requester
    room = await db.rooms.find_one({"_id": ObjectId(request["room_id"])} )
    await manager.send_notification_to_user(
        request["requester_uid"],
        json.dumps({
            "type": "notification",
            "subtype": "join_request_approved",
            "room_id": request["room_id"],
            "room_name": room["name"] if room else "",
            "message": f"Your request to join '{room['name'] if room else ''}' was approved."
        })
    )
    return {"message": "Request approved. User has been added to the room."}


@router.post("/api/requests/{request_id}/deny")
async def deny_join_request(request_id: str, user=Depends(get_current_user)):
    """Denies a join request. Must be the room owner."""
    try:
        req_obj_id = ObjectId(request_id)
    except bson_errors.InvalidId:
        raise HTTPException(status_code=400, detail="Invalid request ID.")

    request = await db.join_requests.find_one({"_id": req_obj_id})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found.")

    if request["owner_uid"] != user["uid"]:
        raise HTTPException(status_code=403, detail="You are not authorized to deny this request.")

    # Update the request status
    await db.join_requests.update_one(
        {"_id": req_obj_id},
        {"$set": {"status": "denied"}}
    )

    # Send real-time notification to requester
    room = await db.rooms.find_one({"_id": ObjectId(request["room_id"])} )
    await manager.send_notification_to_user(
        request["requester_uid"],
        json.dumps({
            "type": "notification",
            "subtype": "join_request_denied",
            "room_id": request["room_id"],
            "room_name": room["name"] if room else "",
            "message": f"Your request to join '{room['name'] if room else ''}' was denied."
        })
    )
    return {"message": "Request denied."}


@router.get("/api/requests/my")
async def get_my_requests(user=Depends(get_current_user)):
    """Get all join requests made by the current user (requester)."""
    requester_uid = user["uid"]
    requests_cursor = db.join_requests.find({"requester_uid": requester_uid}).sort("created_at", -1)
    my_requests = []
    async for req in requests_cursor:
        room = await db.rooms.find_one({"_id": ObjectId(req["room_id"])})
        my_requests.append({
            "request_id": str(req["_id"]),
            "room_id": req["room_id"],
            "room_name": room["name"] if room else "Unknown Room",
            "status": req["status"],
            "created_at": req["created_at"]
        })
    return my_requests 