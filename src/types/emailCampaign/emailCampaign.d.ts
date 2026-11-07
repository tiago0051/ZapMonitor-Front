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
  audienceConsentAt: string | null;
  pausedReason: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  totals: EmailCampaignTotals;
};

type EmailCampaignRecipient = {
  id: string;
  email: string;
  name: string | null;
  contactId: string | null;
  dealId: string | null;
  status: EmailRecipientStatus;
  skipReason: string | null;
  error: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
};

type EmailCampaignRecipientInput = { email: string; name?: string | null; contactId?: string | null; dealId?: string | null };

type EmailAudienceContact = { contactId: string; dealId: string | null; email: string; name: string | null };

type EmailCampaignOptions = {
  senders: { id: string; fromName: string; fromEmail: string }[];
  templates: { id: string; name: string; subject: string }[];
};

type EmailCampaignPage<T> = { total: number; page: number; take: number; items: T[] };
