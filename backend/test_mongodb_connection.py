#!/usr/bin/env python3
"""
Test script to verify MongoDB cloud connection
"""
import asyncio
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load environment variables
load_dotenv()

async def test_mongodb_connection():
    """Test the MongoDB connection"""
    try:
        # Get connection string from environment
        mongo_details = os.getenv("MONGO_DETAILS")
        
        if not mongo_details:
            print("❌ Error: MONGO_DETAILS environment variable not found!")
            print("Please set your MongoDB Atlas connection string in the .env file")
            return False
        
        print(f"🔗 Attempting to connect to MongoDB...")
        print(f"Connection string: {mongo_details[:50]}...")
        
        # Create client
        client = AsyncIOMotorClient(mongo_details)
        
        # Test connection by listing databases
        print("📋 Testing connection by listing databases...")
        db_list = await client.list_database_names()
        
        print(f"✅ Successfully connected to MongoDB!")
        print(f"📊 Available databases: {db_list}")
        
        # Test specific database
        db = client.devsync_mongo
        collections = await db.list_collection_names()
        print(f"📁 Collections in devsync_mongo: {collections}")
        
        # Close connection
        client.close()
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to MongoDB: {str(e)}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Make sure your MongoDB Atlas connection string is correct")
        print("2. Check if your IP address is whitelisted in MongoDB Atlas")
        print("3. Verify your username and password are correct")
        print("4. Ensure your cluster is running")
        return False

if __name__ == "__main__":
    print("🧪 MongoDB Connection Test")
    print("=" * 40)
    
    # Run the test
    result = asyncio.run(test_mongodb_connection())
    
    if result:
        print("\n🎉 MongoDB connection test passed!")
    else:
        print("\n💥 MongoDB connection test failed!")
        print("Please check your configuration and try again.") 