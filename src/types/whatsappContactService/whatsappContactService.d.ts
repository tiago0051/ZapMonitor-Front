type WhatsappContactService = {
  id: string;
  phoneNumber: string;
  name: string;
  surname: string;
  canBeServiceTransferred: boolean;
  canBeServiceEnded: boolean;
  canBeSentMessage: boolean;
  canBeServiceStarted: boolean;
  isInService: boolean;
  canBeForwarded: boolean;
  flowOutputs: { id: string; label: string }[];
  // Pode passar o atendimento para um colega ou grupo (quem atende, fila/automação ou quem tem Gestão)
  canBeTransferredToOthers?: boolean;
  // Nota da última transferência, enquanto ninguém agiu depois dela
  transferNote?: { note: string; fromName: string | null; createdAt: string } | null;
};

type WhatsappTransferOptions = {
  users: { id: string; name: string; online: boolean; isServiceGroupMember: boolean }[];
  serviceGroups: { id: string; name: string; memberCount: number; onlineCount: number }[];
  currentServiceGroupId: string | null;
};
