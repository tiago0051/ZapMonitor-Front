type EmailSenderStatus = "PENDING" | "VERIFIED" | "FAILED";

type EmailDnsRecord = {
  type: "TXT" | "CNAME";
  name: string;
  value: string;
  purpose: string;
  // Sem ele o domínio não é verificado
  required: boolean;
};

type EmailSender = {
  id: string;
  domain: string;
  fromEmail: string;
  fromLocalPart: string;
  fromName: string;
  replyTo: string | null;
  status: EmailSenderStatus;
  dnsRecords: EmailDnsRecord[];
  // Envios dos últimos 30 dias, sem os testes
  stats: { total: number; delivered: number; bounced: number; complained: number; failed: number };
  lastCheckedAt: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type EmailSuppressionReason = "UNSUBSCRIBE" | "BOUNCE" | "COMPLAINT" | "MANUAL";

type EmailSuppression = {
  id: string;
  email: string;
  reason: EmailSuppressionReason;
  detail: string | null;
  createdAt: string;
};

type EmailSuppressionPage = { total: number; page: number; take: number; items: EmailSuppression[] };
