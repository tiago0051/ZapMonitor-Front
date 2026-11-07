type EmailCampaignStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "PAUSED" | "COMPLETED" | "CANCELED";

type EmailRecipientStatus =
  "PENDING" | "SENDING" | "SENT" | "DELIVERED" | "OPENED" | "CLICKED" | "BOUNCED" | "COMPLAINED" | "FAILED" | "SKIPPED" | "CANCELED";

// Totais acumulados: quem clicou também conta como aberto e entregue
type EmailCampaignTotals = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  complained: number;
  failed: number;
  skipped: number;
  canceled: number;
};

type EmailCampaign = {
  id: string;
  name: string;
  status: EmailCampaignStatus;
  senderId: string | null;
  templateId: string | null;
  subject: string;
  sendWindow: BroadcastSendWindow | null;
  frequencyCapDays: number | null;
  clickPipelineId: string | null;
  clickStageId: string | null;
  abTest: EmailAbTest | null;
  audienceConsentAt: string | null;
  pausedReason: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  totals: EmailCampaignTotals;
  // Só no detalhe: links mais clicados
  links?: { url: string; clicks: number; people: number }[];
};

type EmailCampaignRecipient = {
  id: string;
  email: string;
  name: string | null;
  contactId: string | null;
  dealId: string | null;
  status: EmailRecipientStatus;
  variant: "A" | "B" | null;
  skipReason: string | null;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

type EmailCampaignRecipientInput = { email: string; name?: string | null; contactId?: string | null; dealId?: string | null };

type EmailAudienceContact = { contactId: string; dealId: string | null; email: string; name: string | null };

type EmailAbMetric = "OPEN" | "CLICK";

type EmailAbTestConfig = { subjectB: string; testPercent: number; metric: EmailAbMetric; waitMinutes: number };

type EmailAbTest = EmailAbTestConfig & {
  phase: "TESTING" | "DECIDED";
  winner: "A" | "B" | null;
  decideAt: string | null;
  // Só no detalhe da campanha
  results: { A: EmailCampaignTotals; B: EmailCampaignTotals } | null;
};

type EmailCampaignOptions = {
  senders: { id: string; fromName: string; fromEmail: string }[];
  templates: { id: string; name: string; subject: string }[];
  // Só nas opções do editor de fluxos
  sequences?: { id: string; name: string; active: boolean }[];
};

type EmailCampaignPage<T> = { total: number; page: number; take: number; items: T[] };
