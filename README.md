# 📡 ShareScreen LAN & AI Agents

> Aplicación web estilo **TeamViewer** para compartir pantalla en tiempo real a través de la red local (LAN / Wi-Fi) con latencia ultra baja vía **WebRTC**, acompañada de una arquitectura modular de **Agentes de IA** en Python con Gemini.

---

## 🌟 Características Principales

- **⚡ Transmisión de Alta Fluidez**: Transmite tu pantalla a **60 FPS** (1080p / 4K) con latencia inferior a 100ms.
- **📶 Compatibilidad Universal en Red Local**: Funciona entre cualquier dispositivo en la misma red (`Wi-Fi ↔ Wi-Fi`, `Wi-Fi ↔ Ethernet`, `Ethernet ↔ Ethernet`).
- **🔐 Privado y Seguro**: Transmisión de video Peer-to-Peer (P2P) directa entre dispositivos sin pasar por servidores externos de terceros.
- **🔑 Vinculación Simple por PIN**: Generación de salas dinámicas con código de 4 dígitos.
- **🎨 Interfaz Futurista (Dark Glassmorphism)**: Diseño responsive en modo oscuro con métricas de rendimiento en tiempo real (Latencia RTT en ms, FPS e información de resolución).
- **🤖 Arquitectura Modular de Agentes**: Sistema de agentes autónomos con Google Gemini API para diagnóstico de redes, ejecución de herramientas y bucles de feedback (`Agent`, `Tools`, `Orchestrator`).

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
- Python 3.9 o superior.
- Navegador web moderno (Chrome, Firefox, Edge, Brave, Safari).

### 2. Instalación

Clona el repositorio e instala las dependencias:

```bash
# Clonar repositorio
git clone https://github.com/ignacio-martinez-02/ShareScreen.git
cd ShareScreen

# Crear e iniciar entorno virtual (opcional pero recomendado)
python -m venv venv
source venv/bin/activate  # En Windows usar: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt
```

### 3. Ejecución del Servidor Local

```bash
python server.py
```

Al iniciar, la consola mostrará la URL local y la IP asignada en tu red:

```text
======================================================
🚀 SERVIDOR SHARESCREEN LAN INICIADO CORRECTAMENTE
======================================================
💻 Abrir en el equipo que transmite: http://localhost:8000
🌐 Abrir desde cualquier equipo en la red: http://192.168.0.196:8000
======================================================
```

---

## 💻 Instrucciones de Uso

1. **En la computadora que comparte pantalla (Emisor)**:
   - Abre `http://localhost:8000` en tu navegador.
   - Selecciona **"Transmitir Pantalla"**.
   - Copia el **Código de Sala (PIN de 4 dígitos)**.
   - Haz clic en **"Iniciar Compartición"** y selecciona la pantalla o ventana.

2. **En la computadora que recibe la pantalla (Receptor)**:
   - Conéctate a la misma red Wi-Fi o Ethernet.
   - Abre `http://<IP_DEL_SERVIDOR>:8000` (ej. `http://192.168.0.196:8000`).
   - Selecciona **"Recibir Pantalla"**, ingresa el código de 4 dígitos y presiona **Conectar**.

---

## 🌐 Compartir por Internet (Fuera de la Red Local)

Si deseas transmitir a una computadora fuera de tu red local:

```bash
npx localtunnel --port 8000
```

Comparte la URL segura `https://...loca.lt` generada con la otra persona.

---

## 🤖 Módulo de Agentes de IA (`agent.py`, `tools.py`, `orchestrator.py`)

El proyecto incluye un marco modular para definir y coordinar agentes de IA usando el SDK de Gemini:

```python
from agent import Agent
from tools import get_system_network_info
from orchestrator import FeedbackLoopWorkflow

# Definir un agente
dev_agent = Agent(
    name="DevBot",
    role="Diagnóstico de Redes",
    system_instruction="Analiza el estado de la red y el servidor.",
    tools=[get_system_network_info]
)

# Ejecutar el agente
print(dev_agent.run("¿Cuál es la IP local de este equipo?"))
```

---

## 📂 Estructura del Proyecto

```text
ShareScreen/
├── server.py           # Servidor FastAPI + WebSockets para señalización WebRTC
├── requirements.txt    # Dependencias de Python
├── static/
│   ├── index.html      # Interfaz de usuario (Lobby, Emisor, Receptor)
│   ├── style.css       # Estilos CSS3 Dark Glassmorphic
│   └── app.js         # Cliente WebRTC P2P y métricas en vivo
├── agent.py            # Clase modular para agentes Gemini
├── tools.py            # Herramientas personalizadas para agentes
├── orchestrator.py     # Orquestación de flujos multi-agente
├── main.py             # Ejemplo ejecutable de agentes
└── .gitignore          # Archivos excluidos de Git
```

---

## 📜 Licencia

Distribuido bajo la Licencia MIT.
