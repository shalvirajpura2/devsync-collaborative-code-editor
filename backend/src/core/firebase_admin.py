import firebase_admin
from firebase_admin import credentials
import os

# Use environment variable for the service account key path
SERVICE_ACCOUNT_PATH = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
if not SERVICE_ACCOUNT_PATH:
    # Fallback to the default relative path for local development
    SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'serviceAccountKey.json')

cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin_app = firebase_admin.initialize_app(cred) 