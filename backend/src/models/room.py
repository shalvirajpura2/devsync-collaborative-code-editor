from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import List, Optional

class Room(BaseModel):
    name: str
    code: str = "# Welcome to the collaborative Python editor!\\nprint('Hello, World!')"
    owner: str 
    shared_with: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    language: str = "python"
    
class RoomCreate(BaseModel):
    name: str

class RoomUpdate(BaseModel):
    name: Optional[str] = None

class CodeUpdate(BaseModel):
    code: str

class ExecuteCode(BaseModel):
    code: str
    inputs: Optional[List[str]] = None

class ShareRequest(BaseModel):
    share_with_uid: str

class ShareByEmailRequest(BaseModel):
    email: str

class JoinRequest(BaseModel):
    room_id: str
    requester_uid: str
    requester_email: str
    owner_uid: str
    status: str = "pending" # pending, approved, denied
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class JoinRequestInDB(JoinRequest):
    id: str = Field(alias="_id") 