from motor.motor_asyncio import AsyncIOMotorClient
from src.core.config import MONGO_DETAILS

client = AsyncIOMotorClient(MONGO_DETAILS)
db = client.devsync_mongo

# You can add helper functions for database operations here if needed 