from agent import Agent
from tools import get_system_network_info, check_server_status, execute_python_code
from orchestrator import FeedbackLoopWorkflow

def main():
    print("=======================================================")
    print("🤖 SISTEMA DE AGENTES MODULARES DE ANTIGRAVITY")
    print("=======================================================\n")

    # 1. Definición de herramientas disponibles para los agentes
    agent_tools = [get_system_network_info, check_server_status, execute_python_code]

    # 2. Definición limpia de Agentes con Roles y Herramientas
    developer_agent = Agent(
        name="DevBot",
        role="Desarrollador FullStack y Diagnóstico de Redes",
        system_instruction=(
            "Eres un desarrollador experto en Python, WebRTC y redes LAN. "
            "Usa tus herramientas para diagnosticar el estado del sistema y escribir soluciones limpias."
        ),
        tools=agent_tools
    )

    reviewer_agent = Agent(
        name="QA-Reviewer",
        role="QA y Validador de Calidad",
        system_instruction=(
            "Eres un analista QA de software. Analizas el código o respuestas entregadas por el desarrollador. "
            "Si todo está correcto, respondes 'APROBADO'. Si falta algo o hay fallos, respondes 'RECHAZADO' con el feedback."
        )
    )

    # 3. Orquestación mediante Bucle de Feedback
    workflow = FeedbackLoopWorkflow(creator=developer_agent, validator=reviewer_agent, max_attempts=2)
    
    tarea = "Diagnostica la red local y verifica si el servidor ShareScreen está activo."
    resultado, aprobado = workflow.run(tarea)

    print("\n--- RESULTADO FINAL ---")
    print(resultado)

if __name__ == "__main__":
    main()
