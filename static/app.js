// --- ESTADO GLOBAL Y VARIABLES ---
let socket = null;
let peerConnection = null;
let localStream = null;
let currentRoomCode = null;
let userRole = null; // 'sender' | 'receiver'
let statsInterval = null;
let heartbeatInterval = null;
let pendingIceCandidates = [];

// Configuración ICE Server (Google STUN + OpenRelay & Metered TURN)
const rtcConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
        { urls: "stun:stun4.l.google.com:19302" },
        { urls: "stun:global.stun.twilio.com:3478" },
        // Servidores TURN (Relay) indispensables para atravesar routers distintos, Ethernet corp, CGNAT
        {
            urls: "turn:openrelay.metered.ca:80",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turn:openrelay.metered.ca:443",
            username: "openrelayproject",
            credential: "openrelayproject"
        },
        {
            urls: "turns:openrelay.metered.ca:443?transport=tcp",
            username: "openrelayproject",
            credential: "openrelayproject"
        }
    ]
};

// --- INICIALIZACIÓN AL CARGAR LA PÁGINA ---
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("serverIpText").innerText = window.location.hostname;
});

function generateRoomCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

function focusRoomInput() {
    document.getElementById("roomCodeInput").focus();
}

function updateConnectionStatus(status, text) {
    const badge = document.getElementById("connectionBadge");
    const textEl = document.getElementById("statusText");
    textEl.innerText = text;
    
    badge.className = "badge " + (
        status === "online" ? "badge-online" :
        status === "connecting" ? "badge-info" : "badge-offline"
    );
}

function updateReceiverStatus(text) {
    const statusText = document.getElementById("receiverStatusText");
    if (statusText) {
        statusText.innerText = text;
        console.log("[Receiver Status]", text);
    }
}

function resetToLobby() {
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    if (socket) {
        socket.close();
        socket = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
    }

    pendingIceCandidates = [];
    userRole = null;
    currentRoomCode = null;
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("remoteVideo").srcObject = null;

    document.getElementById("lobbySection").classList.remove("hidden");
    document.getElementById("senderSection").classList.add("hidden");
    document.getElementById("receiverSection").classList.add("hidden");
    
    updateConnectionStatus("offline", "Desconectado");
}

// --- CONFIGURACIÓN DEL EMISOR (NOTEBOOK) ---
function setupSender() {
    userRole = "sender";
    currentRoomCode = generateRoomCode();
    document.getElementById("senderRoomCode").innerText = currentRoomCode;

    document.getElementById("lobbySection").classList.add("hidden");
    document.getElementById("senderSection").classList.remove("hidden");

    connectWebSocket(currentRoomCode);
}

function copyRoomCode() {
    if (currentRoomCode) {
        navigator.clipboard.writeText(currentRoomCode);
        alert(`Código de sala ${currentRoomCode} copiado al portapapeles.`);
    }
}

// --- CONFIGURACIÓN DEL RECEPTOR (PC DESKTOP) ---
function setupReceiver() {
    const code = document.getElementById("roomCodeInput").value.trim();
    if (!code || code.length !== 4) {
        alert("Por favor ingresa un código válido de 4 dígitos.");
        return;
    }

    userRole = "receiver";
    currentRoomCode = code;
    document.getElementById("receiverRoomCode").innerText = currentRoomCode;

    document.getElementById("lobbySection").classList.add("hidden");
    document.getElementById("receiverSection").classList.remove("hidden");
    updateReceiverStatus("Conectando al servidor de salas...");

    connectWebSocket(currentRoomCode);
}

// --- CONEXIÓN DE SEÑALIZACIÓN (WEBSOCKETS DE PERSISTENCIA) ---
function connectWebSocket(roomCode) {
    if (socket) {
        try { socket.close(); } catch(e){}
        socket = null;
    }
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws/${roomCode}`;
    
    updateConnectionStatus("connecting", "Conectando...");
    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log(`[WS] Conectado a la sala ${roomCode}`);
        updateConnectionStatus("online", "En Sala (" + roomCode + ")");
        
        // Iniciar Heartbeat Ping cada 15 segundos para evitar que Render o proxies corten la conexión
        heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(jsonMsg({ type: "ping" }));
            }
        }, 15000);

        if (userRole === "receiver") {
            updateReceiverStatus("Conectado a la sala. Solicitando transmisión al emisor...");
            socket.send(jsonMsg({ type: "receiver-ready" }));
        } else if (userRole === "sender" && localStream) {
            socket.send(jsonMsg({ type: "sender-ready" }));
        }
    };

    socket.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === "pong") return; // Ignorar heartbeat
            handleSignalingMessage(data);
        } catch (e) {
            console.error("[WS] Error parseando mensaje:", e);
        }
    };

    socket.onclose = () => {
        console.warn("[WS] Desconectado del servidor.");
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        updateConnectionStatus("offline", "Desconectado");
    };

    socket.onerror = (err) => {
        console.error("[WS] Error de socket:", err);
    };
}

function jsonMsg(obj) {
    return JSON.stringify(obj);
}

// --- PROCESAMIENTO DE MENSAJES DE SEÑALIZACIÓN WEBRTC ---
async function handleSignalingMessage(data) {
    switch (data.type) {
        case "sender-ready":
            console.log("[WebRTC] El emisor ha iniciado compartición de pantalla!");
            if (userRole === "receiver") {
                updateReceiverStatus("El emisor inició transmisión. Solicitando conexión...");
                socket.send(jsonMsg({ type: "receiver-ready" }));
            }
            break;

        case "receiver-ready":
            console.log("[WebRTC] Receptor listo en la sala. Creando oferta WebRTC...");
            if (userRole === "sender" && localStream) {
                if (peerConnection) {
                    peerConnection.close();
                    peerConnection = null;
                }
                initPeerConnection();
                createAndSendOffer();
            }
            break;

        case "offer":
            if (userRole === "receiver") {
                console.log("[WebRTC] Oferta recibida. Configurando descripción remota...");
                updateReceiverStatus("Oferta de video recibida. Negociando conexión WebRTC...");
                if (peerConnection) {
                    peerConnection.close();
                    peerConnection = null;
                }
                initPeerConnection();
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                await processPendingIceCandidates();
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                socket.send(jsonMsg({ type: "answer", answer: answer }));
            }
            break;

        case "answer":
            if (userRole === "sender" && peerConnection) {
                console.log("[WebRTC] Respuesta del receptor recibida. Conexión establecida.");
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                await processPendingIceCandidates();
                document.getElementById("peerStateSender").innerText = "Conectado";
                document.getElementById("peersCountSender").innerText = "1";
            }
            break;

        case "ice-candidate":
            if (data.candidate) {
                const candidate = new RTCIceCandidate(data.candidate);
                if (peerConnection && peerConnection.remoteDescription) {
                    try {
                        await peerConnection.addIceCandidate(candidate);
                    } catch (e) {
                        console.error("[WebRTC] Error añadiendo ICE Candidate:", e);
                    }
                } else {
                    pendingIceCandidates.push(candidate);
                }
            }
            break;

        case "peer-left":
            console.warn("[WebRTC] Notificación de par desconectado.");
            if (userRole === "sender") {
                document.getElementById("peerStateSender").innerText = "Esperando receptor...";
                document.getElementById("peersCountSender").innerText = "0";
            } else if (userRole === "receiver") {
                // Verificar si la conexión WebRTC sigue activa antes de mostrar desconexión
                if (!peerConnection || peerConnection.connectionState !== "connected") {
                    document.getElementById("receiverOverlay").classList.remove("hidden");
                    updateReceiverStatus("El emisor se ha desconectado de la sala.");
                }
            }
            break;
    }
}

async function processPendingIceCandidates() {
    if (peerConnection && peerConnection.remoteDescription) {
        while (pendingIceCandidates.length > 0) {
            const candidate = pendingIceCandidates.shift();
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (e) {
                console.error("[WebRTC] Error añadiendo candidato pendiente:", e);
            }
        }
    }
}

// --- INICIALIZAR PEER CONNECTION ---
function initPeerConnection() {
    if (peerConnection) return;

    peerConnection = new RTCPeerConnection(rtcConfig);

    // Monitorear el estado de la conexión
    peerConnection.onconnectionstatechange = () => {
        console.log("[WebRTC] ConnectionState:", peerConnection.connectionState);
        const stateSender = document.getElementById("peerStateSender");
        if (stateSender && userRole === "sender") {
            stateSender.innerText = peerConnection.connectionState;
        }
        if (userRole === "receiver") {
            if (peerConnection.connectionState === "connecting") {
                updateReceiverStatus("Conectando flujo de video (P2P / Relay TURN)...");
            } else if (peerConnection.connectionState === "connected") {
                updateReceiverStatus("¡Conectado! Cargando video...");
                document.getElementById("receiverOverlay").classList.add("hidden");
            } else if (peerConnection.connectionState === "failed") {
                updateReceiverStatus("Falló conexión P2P. Reintentando por servidor TURN...");
                try { peerConnection.restartIce(); } catch (e) {}
            }
        }
    };

    // Candidatos ICE
    peerConnection.onicecandidate = (event) => {
        if (event.candidate && socket && socket.readyState === WebSocket.OPEN) {
            socket.send(jsonMsg({
                type: "ice-candidate",
                candidate: event.candidate
            }));
        }
    };

    // Si somos emisor, agregamos los tracks de video/audio
    if (userRole === "sender" && localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }

    // Si somos receptor, recibimos el stream remoto
    if (userRole === "receiver") {
        peerConnection.ontrack = (event) => {
            console.log("[WebRTC] Track remoto recibido!", event);
            const remoteVideo = document.getElementById("remoteVideo");
            
            let stream = (event.streams && event.streams[0]) ? event.streams[0] : null;
            if (!stream) {
                stream = new MediaStream();
                stream.addTrack(event.track);
            }

            remoteVideo.srcObject = stream;
            remoteVideo.onloadedmetadata = () => {
                remoteVideo.play().catch(e => console.warn("[WebRTC] Play en metadata err:", e));
            };
            remoteVideo.play().catch(e => console.warn("[WebRTC] Play directo err:", e));

            document.getElementById("receiverOverlay").classList.add("hidden");
            setupRemoteControlListeners();
            startMetricsLoop();
        };
    }
}

async function createAndSendOffer() {
    if (!peerConnection) return;
    const offer = await peerConnection.createOffer({
        offerToReceiveVideo: true,
        offerToReceiveAudio: true
    });
    await peerConnection.setLocalDescription(offer);
    socket.send(jsonMsg({ type: "offer", offer: offer }));
}

// --- INICIAR / DETENER TRANSMISIÓN DE PANTALLA (EMISOR) ---
async function startScreenShare() {
    const qualityPreset = document.getElementById("qualitySelect").value;
    const includeAudio = document.getElementById("audioToggle").checked;

    let videoConstraints = {};

    switch (qualityPreset) {
        case "1080p60":
            videoConstraints = { width: 1920, height: 1080, frameRate: 60 };
            break;
        case "1080p30":
            videoConstraints = { width: 1920, height: 1080, frameRate: 30 };
            break;
        case "720p30":
            videoConstraints = { width: 1280, height: 720, frameRate: 30 };
            break;
        case "4k30":
            videoConstraints = { width: 3840, height: 2160, frameRate: 30 };
            break;
    }

    try {
        try {
            localStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    ...videoConstraints,
                    cursor: "always"
                },
                audio: includeAudio
            });
        } catch (errWithAudio) {
            if (includeAudio) {
                console.warn("[Media] Captura con audio falló. Intentando solo video...", errWithAudio);
                localStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        ...videoConstraints,
                        cursor: "always"
                    },
                    audio: false
                });
            } else {
                throw errWithAudio;
            }
        }

        document.getElementById("localVideo").srcObject = localStream;
        document.getElementById("noStreamOverlay").classList.add("hidden");
        document.getElementById("btnStartShare").classList.add("hidden");
        document.getElementById("btnStopShare").classList.remove("hidden");

        const videoTrack = localStream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        document.getElementById("resSender").innerText = `${settings.width}x${settings.height} @ ${Math.round(settings.frameRate)} FPS`;

        videoTrack.onended = () => {
            stopScreenShare();
        };

        // Notificar a la sala que el emisor ya está compartiendo
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(jsonMsg({ type: "sender-ready" }));

            if (peerConnection) {
                peerConnection.close();
                peerConnection = null;
            }
            initPeerConnection();
            createAndSendOffer();
        }

    } catch (err) {
        console.error("Error al obtener captura de pantalla:", err);
        alert("No se pudo iniciar la captura de pantalla: " + err.message);
    }
}

function stopScreenShare() {
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    document.getElementById("localVideo").srcObject = null;
    document.getElementById("noStreamOverlay").classList.remove("hidden");
    document.getElementById("btnStartShare").classList.remove("hidden");
    document.getElementById("btnStopShare").classList.add("hidden");
    document.getElementById("resSender").innerText = "-";
}

// --- MÉTRICAS Y LATENCIA EN TIEMPO REAL (RECEPTOR) ---
function startMetricsLoop() {
    if (statsInterval) clearInterval(statsInterval);

    statsInterval = setInterval(async () => {
        if (!peerConnection) return;
        const stats = await peerConnection.getStats();
        stats.forEach(report => {
            if (report.type === "candidate-pair" && report.state === "succeeded") {
                if (report.currentRoundTripTime) {
                    const rttMs = Math.round(report.currentRoundTripTime * 1000);
                    document.getElementById("latencyValue").innerText = `${rttMs} ms`;
                }
            }
            if (report.type === "inbound-rtp" && report.kind === "video") {
                if (report.framesPerSecond) {
                    document.getElementById("fpsValue").innerText = Math.round(report.framesPerSecond);
                }
            }
        });
    }, 1000);
}

// --- HERRAMIENTAS DEL RECEPTOR ---
function toggleRemoteAudio() {
    const video = document.getElementById("remoteVideo");
    video.muted = !video.muted;
    document.getElementById("btnAudioMute").innerText = video.muted ? "🔇 Silenciado" : "🔊 Audio";
}

function toggleFullscreen() {
    const container = document.getElementById("viewerContainer");
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => alert("Error al entrar a pantalla completa: " + err.message));
    } else {
        document.exitFullscreen();
    }
}

function takeScreenshot() {
    const video = document.getElementById("remoteVideo");
    if (!video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `ShareScreen_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
    a.click();
}

// --- ESCUCHADORES DE CONTROL REMOTO ---
function setupRemoteControlListeners() {
    const container = document.getElementById("viewerContainer");
    const video = document.getElementById("remoteVideo");

    container.addEventListener("click", (e) => {
        if (userRole !== "receiver" || !socket) return;
        const rect = video.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            socket.send(jsonMsg({
                type: "remote-control",
                action: "click",
                x: x,
                y: y,
                button: e.button === 2 ? "right" : "left"
            }));
        }
    });

    container.addEventListener("mousemove", (e) => {
        if (userRole !== "receiver" || !socket) return;
        const rect = video.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        if (x >= 0 && x <= 1 && y >= 0 && y <= 1) {
            socket.send(jsonMsg({
                type: "remote-control",
                action: "mousemove",
                x: x,
                y: y
            }));
        }
    });

    window.addEventListener("keydown", (e) => {
        if (userRole !== "receiver" || !socket || document.activeElement.tagName === "INPUT") return;
        socket.send(jsonMsg({
            type: "remote-control",
            action: "keydown",
            key: e.key.toLowerCase()
        }));
    });
}
