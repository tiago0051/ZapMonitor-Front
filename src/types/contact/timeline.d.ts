type ContactTimelineWhatsapp = {
  kind: "whatsapp";
  id: string;
  at: string;
  conversationId: string;
  phoneNumber: string;
  // 1 automação, 2 na fila, 3 em atendimento, 4 finalizado
  status: number;
  received: number;
  sent: number;
  preview: string | null;
  summary: string | null;
};

type ContactTimelineEmail = {
  kind: "email";
  id: string;
  at: string;
  subject: string;
  toEmail: string;
  label: string | null;
  purpose: string;
  status: string;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

type ContactTimelineDeal = {
  kind: "deal";
  id: string;
  at: string;
  dealId: string;
  dealTitle: string;
  pipelineName: string;
  type: DealEventType;
  payload: unknown;
  userName: string | null;
};

type ContactTimelineSequence = {
  kind: "sequence";
  id: string;
  at: string;
  sequenceId: string;
  sequenceName: string;
  status: EmailEnrollmentStatus;
  stoppedReason: string | null;
  sentSteps: number;
  totalSteps: number;
  finishedAt: string | null;
};

type ContactTimelineItem = ContactTimelineWhatsapp | ContactTimelineEmail | ContactTimelineDeal | ContactTimelineSequence;

type ContactTimelinePage = { items: ContactTimelineItem[]; nextBefore: string | null };
