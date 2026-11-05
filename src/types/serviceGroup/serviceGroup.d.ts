type ServiceGroup = {
  id: string;
  name: string;
  clientId: string;
  userIds: string[];
  whatsappConfigurationIds: string[];
  // Fluxo de fila padrão de quem espera neste grupo
  queueFlowId: string | null;
  createdAt: string;
  updatedAt: string;
};
