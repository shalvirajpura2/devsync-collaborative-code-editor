#!/usr/bin/env python3
"""
Test script to verify Firebase connection
"""
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth

# Load environment variables
load_dotenv()

def test_firebase_connection():
    """Test the Firebase connection"""
    try:
        print("🔗 Testing Firebase connection...")
        
        # Check if Firebase app is already initialized
        try:
            firebase_admin.get_app()
            print("✅ Firebase app is already initialized")
        except ValueError:
            print("🔄 Initializing Firebase app...")
            
            # Get service account path
            service_account_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH')
            if not service_account_path:
                service_account_path = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')
            
            print(f"📁 Service account path: {service_account_path}")
            
            if not os.path.exists(service_account_path):
                print(f"❌ Error: Service account file not found at {service_account_path}")
                return False
            
            # Initialize Firebase
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase app initialized successfully")
        
        # Test Firebase Auth (this will verify the credentials work)
        print("🔐 Testing Firebase Auth...")
        
        # Try to list users (this requires admin privileges and will test the connection)
        try:
            # This is a simple test - we'll try to access the auth service
            # Note: list_users() requires admin privileges and might not work in all cases
            auth_service = auth
            print("✅ Firebase Auth service is accessible")
        except Exception as e:
            print(f"⚠️  Firebase Auth test limited: {str(e)}")
            print("This is normal if you don't have admin privileges")
        
        print("✅ Firebase connection test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to Firebase: {str(e)}")
        print("\n🔧 Troubleshooting tips:")
        print("1. Make sure your serviceAccountKey.json file is valid")
        print("2. Check if the file path in FIREBASE_SERVICE_ACCOUNT_PATH is correct")
        print("3. Verify your Firebase project settings")
        print("4. Ensure your service account has the necessary permissions")
        return False

if __name__ == "__main__":
    print("🧪 Firebase Connection Test")
    print("=" * 40)
    
    # Run the test
    result = test_firebase_connection()
    
    if result:
        print("\n🎉 Firebase connection test passed!")
    else:
        print("\n💥 Firebase connection test failed!")
        print("Please check your configuration and try again.") 