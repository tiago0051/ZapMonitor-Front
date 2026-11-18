type WhatsappServiceAction = {
  id: string;
  type: number;
  annotation: string;
  // Resultado escolhido ao encerrar; só nas ações de encerramento
  outcome?: string | null;
  createdAt: string;
  userExecuteName: string;
  userServiceName: string;
};
