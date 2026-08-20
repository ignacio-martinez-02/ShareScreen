import os
from typing import List, Callable, Any, Optional
import google.generativeai as genai

# Configuración por defecto de API key mediante variable de entorno
DEFAULT_API_KEY = os.getenv("GEMINI_API_KEY", "")
if DEFAULT_API_KEY:
    genai.configure(api_key=DEFAULT_API_KEY)


class Agent:
    """
    Clase modular para definir un Agente de IA autónomo con Gemini.
    """
    def __init__(
        self,
        name: str,
        role: str,
        system_instruction: str,
        model_name: str = "gemini-3.5-flash",
        tools: Optional[List[Callable[..., Any]]] = None
    ):
        self.name = name
        self.role = role
        self.system_instruction = f"Rol: {self.role}\n\nInstrucción General:\n{system_instruction}"
        self.model_name = model_name
        self.tools = tools or []
        
        # Inicializar el modelo con sus herramientas e instrucciones de sistema
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=self.system_instruction,
            tools=self.tools if self.tools else None
        )
        
        # Iniciar sesión de chat para mantener la memoria conversacional
        self.chat = self.model.start_chat(enable_automatic_function_calling=True)

    def run(self, prompt: str) -> str:
        """Envía un mensaje al agente y devuelve la respuesta en texto."""
        response = self.chat.send_message(prompt)
        return response.text

    def reset_memory(self):
        """Limpia el historial conversacional del agente."""
        self.chat = self.model.start_chat(enable_automatic_function_calling=True)

    def __repr__(self):
        return f"<Agent name='{self.name}' role='{self.role}' model='{self.model_name}'>"
