from typing import List, Tuple
from agent import Agent

class SequentialWorkflow:
    """Ejecuta una secuencia lineal de agentes donde cada respuesta alimenta al siguiente agente."""
    def __init__(self, agents: List[Agent]):
        self.agents = agents

    def run(self, initial_prompt: str) -> str:
        current_input = initial_prompt
        print(f"\n--- Iniciando Flujo Secuencial de {len(self.agents)} Agentes ---")
        for agent in self.agents:
            print(f"🤖 Agente [{agent.name} - {agent.role}] procesando...")
            response = agent.run(current_input)
            print(f"✅ [{agent.name}] completó su tarea.\n")
            current_input = response
        return current_input

class FeedbackLoopWorkflow:
    """
    Orquesta un bucle entre un Agente Creador/Ejecutor y un Agente Validador/Tester
    hasta que la tarea sea aprobada o se alcance el máximo de intentos.
    """
    def __init__(self, creator: Agent, validator: Agent, max_attempts: int = 3):
        self.creator = creator
        self.validator = validator
        self.max_attempts = max_attempts

    def run(self, task_description: str) -> Tuple[str, bool]:
        print(f"\n--- Iniciando Bucle de Feedback ({self.creator.name} ↔ {self.validator.name}) ---")
        
        # 1. El Creador genera el primer borrador
        print(f"💻 [{self.creator.name}] trabajando en la tarea inicial...")
        solution = self.creator.run(f"Tarea: {task_description}")
        
        attempt = 1
        approved = False
        
        while attempt <= self.max_attempts and not approved:
            print(f"\n🕵️ [{self.validator.name}] evaluando (Intento {attempt} de {self.max_attempts})...")
            
            prompt_eval = (
                f"Requerimiento: {task_description}\n\n"
                f"Solución Propuesta por {self.creator.name}:\n{solution}\n\n"
                "Evalúa la solución. Si es correcta y cumple los criterios, responde 'APROBADO'. "
                "Si tiene errores, responde 'RECHAZADO' y detalla los cambios requeridos."
            )
            feedback = self.validator.run(prompt_eval)
            
            if "APROBADO" in feedback.upper():
                print(f"✅ ¡[{self.validator.name}] ha APROBADO la solución!")
                approved = True
            else:
                print(f"⚠️ [{self.validator.name}] solicitó correcciones.")
                if attempt < self.max_attempts:
                    print(f"💻 [{self.creator.name}] aplicando correcciones...")
                    solution = self.creator.run(
                        f"El validador rechazó la propuesta por las siguientes razones:\n{feedback}\n\n"
                        "Por favor corrige la solución entregando la versión final."
                    )
                attempt += 1

        return solution, approved
