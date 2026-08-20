import socket
import urllib.request
import sys
import io

def get_system_network_info() -> str:
    """Obtiene la dirección IP local del sistema y el nombre del host."""
    try:
        hostname = socket.gethostname()
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return f"Host: {hostname} | IP Local: {local_ip}"
    except Exception as e:
        return f"Error obteniendo información de red: {e}"

def check_server_status(port: int = 8000) -> str:
    """Verifica si el servidor de ShareScreen está activo respondiendo HTTP en el puerto indicado."""
    try:
        url = f"http://127.0.0.1:{port}/"
        req = urllib.request.urlopen(url, timeout=2)
        if req.status == 200:
            return f"✅ El servidor ShareScreen está ACTIVO en http://127.0.0.1:{port}"
        return f"⚠️ El servidor respondió con estado HTTP {req.status}"
    except Exception as e:
        return f"❌ El servidor ShareScreen no está corriendo en el puerto {port}: {e}"

def execute_python_code(code: str) -> str:
    """Ejecuta un bloque de código Python y devuelve la salida o error resultante."""
    old_stdout = sys.stdout
    redirected_output = io.StringIO()
    sys.stdout = redirected_output
    try:
        exec(code, {"__name__": "__main__"})
        output = redirected_output.getvalue()
        return f"Salida:\n{output if output else '[Sin salida de texto]'}"
    except Exception as e:
        return f"Error de ejecución: {type(e).__name__} - {e}"
    finally:
        sys.stdout = old_stdout
