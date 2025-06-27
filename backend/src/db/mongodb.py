from motor.motor_asyncio import AsyncIOMotorClient
from src.core.config import MONGO_DETAILS
import gspread
from google.oauth2.service_account import Credentials
import os

client = AsyncIOMotorClient(MONGO_DETAILS)
db = client.devsync_mongo

# You can add helper functions for database operations here if needed 

def get_feedback_collection():
    return db["feedback"] 

# Use an absolute path for the credentials file
GSHEET_CREDENTIALS_FILE = r'D:\manus devsync final\backend\google-credentials.json'
GSHEET_SHEET_NAME = 'DevSync Feedback'

def append_feedback_to_gsheet(feedback: dict):
    print('Current working directory:', os.getcwd())
    print('Looking for credentials at:', GSHEET_CREDENTIALS_FILE)
    print('File exists:', os.path.exists(GSHEET_CREDENTIALS_FILE))
    # Authenticate and open the sheet
    creds = Credentials.from_service_account_file(GSHEET_CREDENTIALS_FILE, scopes=[
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive',
    ])
    gc = gspread.authorize(creds)
    sh = gc.open(GSHEET_SHEET_NAME)
    worksheet = sh.sheet1  # Use the first worksheet
    # Prepare row (order: name, org, message, social, timestamp)
    from datetime import datetime
    row = [
        feedback.get('name', ''),
        feedback.get('org', ''),
        feedback.get('message', ''),
        feedback.get('social', ''),
        datetime.utcnow().isoformat()
    ]
    worksheet.append_row(row) 