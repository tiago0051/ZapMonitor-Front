type EmailEnrollmentStatus = "ACTIVE" | "COMPLETED" | "STOPPED";

type EmailSequenceStep = { delayMinutes: number; templateId: string | null };

type EmailSequence = {
  id: string;
  name: string;
  senderId: string | null;
  active: boolean;
  stopOnWhatsappReply: boolean;
  stopOnDealWon: boolean;
  sendWindow: BroadcastSendWindow | null;
  steps: EmailSequenceStep[];
  enrollments: { active: number; completed: number; stopped: number };
  createdAt: string;
  updatedAt: string;
};

type EmailSequenceInput = Pick<EmailSequence, "name" | "senderId" | "stopOnWhatsappReply" | "stopOnDealWon" | "sendWindow" | "steps">;

type EmailEnrollment = {
  id: string;
  sequenceId: string;
  sequenceName: string;
  contactId: string;
  contactName: string | null;
  dealId: string | null;
  status: EmailEnrollmentStatus;
  // Próximo e-mail (começa em 0)
  stepIndex: number;
  nextRunAt: string | null;
  stoppedReason: string | null;
  source: "MANUAL" | "FLOW";
  lastSentAt: string | null;
  finishedAt: string | null;
  createdAt: string;
};
