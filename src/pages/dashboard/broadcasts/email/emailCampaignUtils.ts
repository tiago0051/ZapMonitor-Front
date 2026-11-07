import { broadcastStatusInfo, parseCsv } from "../broadcastUtils";

const green = "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
const amber = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
const red = "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
const blue = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
const muted = "bg-muted text-muted-foreground";

export const emailCampaignStatusInfo: Record<EmailCampaignStatus, { label: string; className: string }> = broadcastStatusInfo;

export const emailRecipientStatusInfo: Record<EmailRecipientStatus, { label: string; className: string }> = {
  PENDING: { label: "Na fila", className: muted },
  SENDING: { label: "Enviando", className: amber },
  SENT: { label: "Enviado", className: blue },
  DELIVERED: { label: "Entregue", className: blue },
  OPENED: { label: "Abriu", className: green },
  CLICKED: { label: "Clicou", className: green },
  BOUNCED: { label: "Voltou", className: red },
  COMPLAINED: { label: "Marcou como spam", className: red },
  FAILED: { label: "Falhou", className: red },
  SKIPPED: { label: "Ignorado", className: muted },
  CANCELED: { label: "Cancelado", className: muted },
};

/** Quanto da campanha já saiu da fila. */
export const emailProgressOf = (totals: EmailCampaignTotals) =>
  totals.total > 0 ? Math.round(((totals.total - totals.pending) / totals.total) * 100) : 0;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (raw: string) => {
  const value = raw.trim().toLowerCase();
  return EMAIL_PATTERN.test(value) && value.length <= 191 ? value : null;
};

export type EmailAudienceRow = { email: string; name: string | null; contactId: string | null; dealId: string | null };

export type EmailAudienceSources = {
  crm: EmailAudienceRow[];
  tags: EmailAudienceRow[];
  all: EmailAudienceRow[];
  csv: { fileName: string; headers: string[]; rows: string[][]; emailColumn: string; nameColumn: string } | null;
  pasted: string;
};

export const emptyEmailAudience: EmailAudienceSources = { crm: [], tags: [], all: [], csv: null, pasted: "" };

export const readEmailCsv = async (file: File) => parseCsv(await file.text());

const csvRows = (csv: EmailAudienceSources["csv"]): EmailAudienceRow[] => {
  if (!csv?.emailColumn) return [];
  const emailIndex = csv.headers.indexOf(csv.emailColumn);
  const nameIndex = csv.nameColumn ? csv.headers.indexOf(csv.nameColumn) : -1;
  return csv.rows.map((row) => ({
    email: row[emailIndex] ?? "",
    name: nameIndex >= 0 ? row[nameIndex] || null : null,
    contactId: null,
    dealId: null,
  }));
};

/** Um e-mail por linha; o nome pode vir depois de vírgula ou ponto e vírgula. */
export const parsePastedEmails = (text: string): EmailAudienceRow[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email, ...rest] = line.split(/[;,\t]/);
      return { email: email.trim(), name: rest.join(" ").trim() || null, contactId: null, dealId: null };
    });

/** Junta as fontes, tira inválidos e repetidos (as fichas do CRM vêm primeiro e ficam com o negócio). */
export function summarizeEmailAudience(sources: EmailAudienceSources) {
  const rows = [...sources.crm, ...sources.tags, ...sources.all, ...csvRows(sources.csv), ...parsePastedEmails(sources.pasted)];
  const seen = new Set<string>();
  const ready: EmailAudienceRow[] = [];
  let invalid = 0;
  let duplicates = 0;

  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) {
      invalid++;
      continue;
    }
    if (seen.has(email)) {
      duplicates++;
      continue;
    }
    seen.add(email);
    ready.push({ ...row, email });
  }
  return { ready, invalid, duplicates };
}

/** Baixa um arquivo gerado na tela. */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
};
