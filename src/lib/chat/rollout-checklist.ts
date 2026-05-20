export const CHAT_SECURITY_CONTROLS = [
  "Validar sesión en cada endpoint de chat.",
  "Verificar membresía del thread antes de leer/enviar mensajes.",
  "Sanitizar cuerpo del mensaje para evitar XSS.",
  "Restringir cambios de presencia al usuario autenticado.",
  "Registrar auditoría para acciones administrativas de canales.",
] as const;

export const CHAT_ROLLOUT_PHASES = [
  {
    phase: "Fase 1",
    scope: "Directos, canales básicos, lectura, presencia y DND.",
    successMetric: "Mensajes entregados en <2s en p95 con polling activo.",
  },
  {
    phase: "Fase 2",
    scope: "Adjuntos, menciones y búsqueda.",
    successMetric: "Reducción de tiempo de coordinación en tareas inter-área.",
  },
  {
    phase: "Fase 3",
    scope: "Reacciones, respuestas en hilo y políticas de retención.",
    successMetric: "Aumento de adopción semanal y menor dependencia de canales externos.",
  },
] as const;
