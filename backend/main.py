"""SAN I/O Workload Monitoring Backend
Main FastAPI application entry point
"""
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import asyncio
from typing import List
import json

from monitor import IOMonitor
from api import router, set_monitor
from config import Config

# Global monitor instance
monitor: IOMonitor = None
config: Config = None
active_connections: List[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle"""
    global monitor, config
    
    # Load configuration
    config = Config()
    
    # Initialize and start monitor
    monitor = IOMonitor(config)
    monitor.start()
    
    # Set monitor instance for API router
    set_monitor(monitor, config)
    
    # Start background task for broadcasting updates
    asyncio.create_task(broadcast_updates())
    
    yield
    
    # Cleanup on shutdown
    if monitor:
        monitor.stop()


app = FastAPI(
    title="SAN I/O Workload Monitor",
    description="Real-time I/O workload monitoring for SAN-mounted storage",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "SAN I/O Workload Monitor",
        "version": "1.0.0"
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        while True:
            # Keep connection alive and wait for client messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        active_connections.remove(websocket)


async def broadcast_updates():
    """Background task to broadcast I/O updates to connected clients"""
    global monitor, active_connections
    
    while True:
        await asyncio.sleep(0.5)  # Update every 500ms for real-time feel
        
        if monitor and active_connections:
            # Get latest workload data
            workload_data = monitor.get_current_workload()
            
            # Broadcast to all connected clients
            disconnected = []
            for connection in active_connections:
                try:
                    await connection.send_json(workload_data)
                except Exception:
                    disconnected.append(connection)
            
            # Remove disconnected clients
            for conn in disconnected:
                if conn in active_connections:
                    active_connections.remove(conn)


if __name__ == "__main__":
    import uvicorn
    # Run on port 8001 to match the frontend dev server proxy
    uvicorn.run(app, host="0.0.0.0", port=8001)
