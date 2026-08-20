import os
import socket
import json
import asyncio
from typing import Dict, Set
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Intentar importar pyautogui para control remoto opcional
try:
    import pyautogui
    pyautogui.FAILSAFE = False
except Exception:
    pyautogui = None
except BaseException:
    pyautogui = None


app = FastAPI(title="ShareScreen LAN Server")

# Montar directorio estático
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Gestor de conexiones para la señalización WebRTC por sala (Room ID)
class ConnectionManager:
    def __init__(self):
        # Mapea room_id -> set de websockets
        self.rooms: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, room_id: str):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(websocket)
        print(f"[+] Dispositivo conectado a la sala '{room_id}'. Total en sala: {len(self.rooms[room_id])}")

    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            if len(self.rooms[room_id]) == 0:
                del self.rooms[room_id]
        print(f"[-] Dispositivo desconectado de la sala '{room_id}'.")

    async def broadcast_to_room(self, message: str, sender: WebSocket, room_id: str):
        if room_id in self.rooms:
            for connection in self.rooms[room_id]:
                if connection != sender:
                    try:
                        await connection.send_text(message)
                    except Exception as e:
                        print(f"[!] Error al enviar mensaje: {e}")

manager = ConnectionManager()

@app.get("/")
async def get_index():
    return FileResponse(os.path.join(static_dir, "index.html"))

@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await manager.connect(websocket, room_id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type")

                # Manejo opcional de control remoto (mouse/teclado) si pyautogui está disponible
                if msg_type == "remote-control" and pyautogui:
                    action = msg.get("action")
                    if action == "mousemove":
                        # Coordenadas relativas en porcentaje (0.0 a 1.0)
                        rx, ry = msg.get("x", 0), msg.get("y", 0)
                        screen_w, screen_h = pyautogui.size()
                        pyautogui.moveTo(int(rx * screen_w), int(ry * screen_h))
                    elif action == "click":
                        rx, ry = msg.get("x", 0), msg.get("y", 0)
                        button = msg.get("button", "left")
                        screen_w, screen_h = pyautogui.size()
                        pyautogui.click(int(rx * screen_w), int(ry * screen_h), button=button)
                    elif action == "keydown":
                        key = msg.get("key")
                        if key:
                            pyautogui.press(key)
                    elif action == "scroll":
                        dy = msg.get("deltaY", 0)
                        pyautogui.scroll(-int(dy))
                else:
                    # Reenviar mensajería WebRTC (offer, answer, ice-candidate, etc.) a los otros pares
                    await manager.broadcast_to_room(data, websocket, room_id)

            except json.JSONDecodeError:
                await manager.broadcast_to_room(data, websocket, room_id)

    except WebSocketDisconnect:
        manager.disconnect(websocket, room_id)
        # Notificar a los pares restantes
        await manager.broadcast_to_room(json.dumps({"type": "peer-left"}), websocket, room_id)

def get_local_ip():
    """Detecta la dirección IP local de la interfaz de red (Wi-Fi o Ethernet)"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    local_ip = get_local_ip()
    port = 8000
    print("\n=======================================================")
    print("🚀 SERVIDOR SHARESCREEN LAN INICIADO CORRECTAMENTE")
    print("=======================================================")
    print(f"💻 Abrir en el equipo que transmite: http://localhost:{port}")
    print(f"🌐 Abrir desde cualquier PC/Laptop en la red (Wi-Fi o Ethernet): http://{local_ip}:{port}")
    print("=======================================================\n")

    uvicorn.run(app, host="0.0.0.0", port=port)
