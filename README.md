# 📡 ShareScreen LAN

> Aplicación web estilo **TeamViewer** para compartir pantalla en tiempo real a través de la red local (LAN / Wi-Fi) o Internet con latencia ultra baja vía **WebRTC** y servidor de señalización en **Python FastAPI**.

---

## 🌟 Características Principales

- **⚡ Transmisión de Alta Fluidez**: Transmite tu pantalla a **60 FPS** (1080p / 4K) con latencia inferior a 100ms.
- **📶 Compatibilidad Universal**: Funciona entre cualquier dispositivo en la misma red (`Wi-Fi ↔ Wi-Fi`, `Wi-Fi ↔ Ethernet`, `Ethernet ↔ Ethernet`) o a través de Internet via túnel HTTPS.
- **🔐 Privado y Seguro**: Transmisión de video Peer-to-Peer (P2P) directa entre dispositivos sin servidores externos de terceros ni claves API.
- **🔑 Vinculación Simple por PIN**: Generación de salas dinámicas con código de 4 dígitos.
- **🎨 Interfaz Futurista (Dark Glassmorphism)**: Diseño responsive en modo oscuro con métricas de rendimiento en tiempo real (Latencia RTT en ms, FPS e información de resolución).
- **🚀 Listo para Despliegue**: Compatible con Render.com, Railway, LocalTunnel y redes locales.

---

## 🚀 Inicio Rápido

### 1. Requisitos Previos
- Python 3.9 o superior.
- Navegador web moderno (Chrome, Firefox, Edge, Brave, Safari).

### 2. Instalación

```bash
# Clonar repositorio
git clone https://github.com/ignacio-martinez-02/ShareScreen.git
cd ShareScreen

# Crear e iniciar entorno virtual (opcional)
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

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

## 📂 Estructura del Proyecto

```text
ShareScreen/
├── server.py           # Servidor FastAPI + WebSockets para señalización WebRTC
├── requirements.txt    # Dependencias mínimas de Python
├── static/
│   ├── index.html      # Interfaz de usuario (Lobby, Emisor, Receptor)
│   ├── style.css       # Estilos CSS3 Dark Glassmorphic
│   └── app.js         # Cliente WebRTC P2P y métricas en vivo
├── README.md           # Documentación del proyecto
└── .gitignore          # Archivos excluidos de Git
```

---

## 📜 Licencia

Distribuido bajo la Licencia MIT.
