# How to Get Your MongoDB Atlas Connection String

## Step 1: Access MongoDB Atlas
1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Sign in to your account
3. Select your cluster

## Step 2: Get Connection String
1. Click on **"Connect"** button for your cluster
2. Choose **"Connect your application"**
3. Select **"Python"** as your driver
4. Choose the appropriate version (3.6 or later)
5. Copy the connection string

## Step 3: Update Your Connection String
The connection string will look like this:
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

**Important:** Replace the following:
- `username` with your MongoDB Atlas username
- `password` with your MongoDB Atlas password
- `cluster` with your actual cluster name
- `database` with `devsync_mongo` (or your preferred database name)

## Step 4: Update .env File
1. Open the `.env` file in the backend directory
2. Replace the placeholder connection string with your actual connection string
3. Save the file

## Step 5: Test Connection
Run the test script to verify your connection:
```bash
python test_mongodb_connection.py
```

## Troubleshooting
- **IP Whitelist**: Make sure your IP address is whitelisted in MongoDB Atlas
- **Username/Password**: Verify your credentials are correct
- **Network Access**: Check if your cluster allows connections from your IP
- **Cluster Status**: Ensure your cluster is running

## Security Notes
- Never commit your `.env` file to version control
- Use strong passwords for your MongoDB Atlas account
- Consider using environment variables in production 