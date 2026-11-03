export enum WhatsappServiceStatus {
  UNKNOWN = 0,
  // Conduzido pelo fluxo (agente de IA ou pergunta condicional), fora da fila humana
  AUTOMATION = 1,
  WAITING_ATTENDANT = 2,
  HUMAN_ACTIVE = 3,
  FINISHED = 4,
}
