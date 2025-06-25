# Collaborative Code Editor

A real-time, web-based collaborative code editor for Python, built with FastAPI and React. This application allows multiple users to join coding rooms, write and edit Python code together, and see the execution output in real-time.

![Project Demo](https://placehold.co/600x400/2d3748/ffffff?text=Project+Screenshot)

---

## Features

- **Real-Time Collaboration**: Code changes are synchronized across all users in a room instantly using WebSockets.
- **Code Execution**: Execute Python code on the server and view the output (stdout and stderr) directly in the browser.
- **Multiple Rooms**: Create new coding rooms or join existing ones.
- **Simple UI**: A clean and intuitive interface built with React and modern UI components.
- **Scalable Backend**: Built with the high-performance FastAPI framework.
- **Easy to Run**: Fully containerized with Docker for easy setup and deployment.

---

## Tech Stack

| Area      | Technology                               |
|-----------|------------------------------------------|
| **Backend** | Python, FastAPI, MongoDB, Uvicorn, WebSockets |
| **Frontend**| React, Vite, Monaco Editor, Radix UI, Tailwind CSS |
| **Database**| MongoDB                                  |

---

## Project Structure

The project is a monorepo containing two main packages: `backend` and `frontend`.

```
/
├── backend/
│   ├── src/
│   │   ├── api/          # API routes and endpoints
│   │   ├── core/         # Configuration (env vars)
│   │   ├── db/           # Database connection
│   │   ├── models/       # Pydantic data models
│   │   ├── services/     # Business logic
│   │   └── main.py       # Main FastAPI app entrypoint
│   └── requirements.txt  # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── pages/        # Page components (routed)
│   │   ├── App.jsx       # Root component with routing
│   │   └── main.jsx      # Frontend entrypoint
│   ├── .env.example      # Environment variable template
│   └── package.json      # Node.js dependencies
│
└── .gitignore            # Files to ignore in version control
```

---

## Getting Started

Follow these instructions to get the project up and running on your local machine.

### Prerequisites

- [Python 3.8+](https://www.python.org/)
- [Node.js 16+](https://nodejs.org/) (with npm or pnpm)
- [MongoDB](https://www.mongodb.com/try/download/community) instance running

### 1. Clone the Repository

```sh
git clone https://github.com/your-username/your-repo-name.git
cd your-repo-name
```

### 2. Backend Setup

First, set up and run the backend server.

```sh
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`

# Install dependencies
pip install -r requirements.txt

# Run the server
# The server will run on http://localhost:5000
uvicorn src.main:app --reload --port 5000
```

### 3. Frontend Setup

In a separate terminal, set up and run the frontend development server.

```sh
# Navigate to the frontend directory
cd frontend

# Copy the environment variable template
cp .env.example .env

# Make sure the variables in .env point to your backend.
# Default:
# VITE_API_BASE_URL=http://localhost:5000
# VITE_WS_BASE_URL=ws://localhost:5000

# Install dependencies (using pnpm is recommended)
pnpm install

# Run the development server
# The app will be available at http://localhost:5173
pnpm dev
```

### 4. Access the Application

Open your browser and navigate to `http://localhost:5173`. You should see the collaborative code editor running!

---

## How It Works

1.  **Room Management**: Users can create or join rooms from the main page. Room data is stored in MongoDB.
2.  **Editor View**: When a user joins a room, they are taken to the editor page. The URL contains the unique room ID.
3.  **WebSocket Connection**: The frontend establishes a WebSocket connection to the backend for the specific room.
4.  **Real-Time Sync**: When a user types in the editor, the code changes are sent through the WebSocket to the backend, which then broadcasts the changes to all other users in the same room.
5.  **Code Execution**: When the "Run" button is clicked, the code is sent to a secure API endpoint on the backend. The backend executes the code in a temporary file and returns the result, which is then broadcast to all users via WebSocket.

---

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## License

This project is licensed under the MIT License - see the `LICENSE` file for details. 