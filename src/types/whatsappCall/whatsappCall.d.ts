type WhatsappCallDirection = "INCOMING" | "OUTGOING";

// ANSWERING: um atendente pegou a ligação recebida e a resposta de áudio está indo para a Meta
type WhatsappCallStatus = "RINGING" | "ANSWERING" | "IN_PROGRESS" | "ENDED" | "MISSED" | "REJECTED" | "FAILED";

type WhatsappCall = {
  id: string;
  direction: WhatsappCallDirection;
  status: WhatsappCallStatus;
  contactId: string;
  configurationId: string;
  // Quem atendeu (recebida) ou quem ligou (feita)
  userId: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

// Ligação recebida tocando, com a oferta de áudio da Meta para atender pelo navegador
type WhatsappIncomingCall = {
  call: WhatsappCall;
  sdpOffer: string | null;
  contact: {
    id: string;
    name: string | null;
    phoneNumber: string;
    serviceGroupId: string | null;
    userIdInService: string | null;
  } | null;
};

// Resposta de áudio do contato a uma ligação feita pelo atendente
type WhatsappCallAnswer = { callId: string; userId: string | null; sdp: string };

type WhatsappCallAvailability = {
  callingEnabled: boolean;
  // granted, temporary ou no_permission, como a Meta informa
  permissionStatus: string | null;
  canCall: boolean;
  canRequestPermission: boolean;
  isWindowOpen: boolean;
  reason: string | null;
};
