"""
FastAPI proxy with WebSocket support for Node.js backend
Auto-starts Node.js backend if not running
"""
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
import websockets
import os
import asyncio
import subprocess
import socket
from dotenv import load_dotenv

# Load .env file
load_dotenv('/app/backend/.env')

# Debug: log env at startup
print("[Proxy] COOKIE_ENC_KEY present:", "COOKIE_ENC_KEY" in os.environ)
print("[Proxy] COOKIE_ENC_KEY length:", len(os.environ.get("COOKIE_ENC_KEY", "")))
print("[Proxy] MONGODB_URI:", os.environ.get("MONGODB_URI", "NOT SET"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NODE_BACKEND_URL = "http://127.0.0.1:8003"
NODE_WS_URL = "ws://127.0.0.1:8003"
node_process = None

def is_port_open(port: int) -> bool:
    """Check if a port is already in use"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def kill_process_on_port(port: int) -> bool:
    """Kill any process listening on the specified port"""
    try:
        # Find PID using lsof
        result = subprocess.run(
            ["lsof", "-ti", f":{port}"],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            for pid in pids:
                try:
                    os.kill(int(pid), 9)
                    print(f"[Proxy] Killed process {pid} on port {port}")
                except (ProcessLookupError, ValueError):
                    pass
            return True
    except Exception as e:
        print(f"[Proxy] Error killing process on port {port}: {e}")
    return False

async def start_node_backend():
    """Start Node.js backend - always with fresh environment"""
    global node_process
    
    # ALWAYS kill existing Node.js process to ensure fresh ENV
    if is_port_open(8003):
        print("[Proxy] Killing existing Node.js process to restart with fresh ENV...")
        kill_process_on_port(8003)
        await asyncio.sleep(2)  # Wait for port to be released
    
    print("[Proxy] Starting Node.js backend with fresh environment...")
    
    # Build environment from .env file + current env
    env = os.environ.copy()
    
    # Explicitly read and set all vars from .env
    with open('/app/backend/.env', 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                env[key] = value
    
    env["PORT"] = "8003"
    env["NODE_OPTIONS"] = "--max-old-space-size=2048"
    
    # Log critical env vars being passed
    print(f"[Proxy] Passing MONGODB_URI to Node.js: {bool(env.get('MONGODB_URI'))}")
    print(f"[Proxy] MONGODB_URI: {env.get('MONGODB_URI', 'NOT SET')}")
    print(f"[Proxy] TELEGRAM_BOT_TOKEN present: {bool(env.get('TELEGRAM_BOT_TOKEN'))}")
    
    # Open log files
    stdout_log = open("/var/log/supervisor/backend-node.out.log", "a")
    stderr_log = open("/var/log/supervisor/backend-node.err.log", "a")
    
    node_process = subprocess.Popen(
        ["npx", "tsx", "src/server-minimal.ts"],
        cwd="/app/backend",
        env=env,
        stdout=stdout_log,
        stderr=stderr_log,
        start_new_session=True  # Detach from parent
    )
    
    # Wait for Node.js to start (with retries)
    for i in range(60):  # Wait up to 60 seconds
        await asyncio.sleep(1)
        if is_port_open(8003):
            print(f"[Proxy] Node.js backend started (PID {node_process.pid}) after {i+1}s")
            return
    
    print(f"[Proxy] WARNING: Node.js backend may not have started properly (PID {node_process.pid})")

@app.on_event("startup")
async def startup():
    print("[Proxy] Initializing FastAPI proxy...")
    await start_node_backend()
    print("[Proxy] Ready to proxy requests to Node.js backend on port 8003")

@app.on_event("shutdown")
async def shutdown():
    global node_process
    print("[Proxy] Shutting down...")
    if node_process and node_process.poll() is None:
        print(f"[Proxy] Terminating Node.js backend (PID {node_process.pid})")
        node_process.terminate()
        try:
            node_process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            node_process.kill()

@app.websocket("/ws")
async def websocket_proxy(websocket: WebSocket):
    await websocket.accept()
    try:
        async with websockets.connect(f"{NODE_WS_URL}/ws") as ws_backend:
            async def forward_to_client():
                try:
                    async for message in ws_backend:
                        await websocket.send_text(message)
                except Exception:
                    pass

            async def forward_to_backend():
                try:
                    while True:
                        data = await websocket.receive_text()
                        await ws_backend.send(data)
                except WebSocketDisconnect:
                    pass

            await asyncio.gather(forward_to_client(), forward_to_backend())
    except Exception as e:
        print(f"[WS Proxy] Error: {e}")
        await websocket.close()

@app.websocket("/api/ws")
async def api_websocket_proxy(websocket: WebSocket):
    await websocket.accept()
    try:
        async with websockets.connect(f"{NODE_WS_URL}/api/ws") as ws_backend:
            async def forward_to_client():
                try:
                    async for message in ws_backend:
                        await websocket.send_text(message)
                except Exception:
                    pass

            async def forward_to_backend():
                try:
                    while True:
                        data = await websocket.receive_text()
                        await ws_backend.send(data)
                except WebSocketDisconnect:
                    pass

            await asyncio.gather(forward_to_client(), forward_to_backend())
    except Exception as e:
        print(f"[WS Proxy] Error: {e}")
        await websocket.close()

@app.get("/health")
async def health():
    """Python Gateway health check"""
    node_healthy = is_port_open(8003)
    return {
        "service": "python-gateway",
        "status": "ok",
        "node_backend": "connected" if node_healthy else "disconnected"
    }

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy(request: Request, path: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{NODE_BACKEND_URL}/{path}"
        
        headers = dict(request.headers)
        headers.pop("host", None)
        
        try:
            if request.method == "GET":
                response = await client.get(url, headers=headers, params=request.query_params)
            elif request.method == "POST":
                body = await request.body()
                response = await client.post(url, headers=headers, content=body)
            elif request.method == "PUT":
                body = await request.body()
                response = await client.put(url, headers=headers, content=body)
            elif request.method == "DELETE":
                response = await client.delete(url, headers=headers)
            elif request.method == "PATCH":
                body = await request.body()
                response = await client.patch(url, headers=headers, content=body)
            else:
                response = await client.options(url, headers=headers)
            
            return StreamingResponse(
                iter([response.content]),
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
        except httpx.ConnectError:
            return JSONResponse(
                status_code=503,
                content={"error": "Node.js backend unavailable", "detail": "Backend is starting..."}
            )
        except Exception as e:
            return JSONResponse(
                status_code=500,
                content={"error": str(e)}
            )
