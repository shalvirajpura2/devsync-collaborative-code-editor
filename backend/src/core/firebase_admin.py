import firebase_admin
from firebase_admin import credentials
import os

# Path to the service account key
SERVICE_ACCOUNT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'serviceAccountKey.json')

cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin_app = firebase_admin.initialize_app(cred) 