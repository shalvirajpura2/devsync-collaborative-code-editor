import os
import sys
import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

# Add src to path to allow for absolute imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.api import rooms

app = FastAPI(title="Collaborative Code Editor")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(rooms.router)

# Serve static files from the 'static' directory
static_folder_path = os.path.join(os.path.dirname(__file__), 'static')

if os.path.exists(static_folder_path):
    app.mount("/static", StaticFiles(directory=static_folder_path), name="static")

    @app.get("/", include_in_schema=False)
    async def serve_index():
        """Serve the main index.html file"""
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"message": "Frontend not built yet. Please build the React app first."}

    @app.get("/{path:path}", include_in_schema=False)
    async def serve_static_files(path: str):
        """Serve static files or fallback to index.html for SPA routing"""
        file_path = os.path.join(static_folder_path, path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return FileResponse(index_path)
        
        return {"message": "File not found"}

if __name__ == '__main__':
    uvicorn.run("main:app", host='0.0.0.0', port=5000, reload=True)

