import { isValidPhoneNumber, parsePhoneNumberFromString } from "libphonenumber-js";

const green = "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300";
const amber = "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
const red = "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300";
const blue = "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
const muted = "bg-muted text-muted-foreground";

export const broadcastStatusInfo: Record<BroadcastStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: muted },
  SCHEDULED: { label: "Agendada", className: blue },
  SENDING: { label: "Enviando", className: amber },
  PAUSED: { label: "Pausada", className: red },
  COMPLETED: { label: "Concluída", className: green },
  CANCELED: { label: "Cancelada", className: muted },
};

export const recipientStatusInfo: Record<BroadcastRecipientStatus, { label: string; className: string }> = {
  PENDING: { label: "Na fila", className: muted },
  SENDING: { label: "Enviando", className: amber },
  SENT: { label: "Enviado", className: blue },
  DELIVERED: { label: "Entregue", className: blue },
  READ: { label: "Lido", className: green },
  REPLIED: { label: "Respondeu", className: green },
  FAILED: { label: "Falhou", className: red },
  SKIPPED: { label: "Ignorado", className: muted },
  CANCELED: { label: "Cancelado", className: muted },
};

export const skipReasonLabel: Record<string, string> = {
  OPTED_OUT: "Pediu para não receber marketing",
  INVALID_PHONE: "Número inválido",
  FREQUENCY_CAP: "Recebeu outra campanha de marketing há pouco",
};

export const optOutSourceLabel: Record<BroadcastOptOut["source"], string> = {
  KEYWORD: "Mensagem",
  BUTTON: "Botão",
  MANUAL: "Manual",
};

/** Percentual de uma parte sobre a base, sem casas; nulo sem base. */
export const rate = (part: number, base: number) => (base > 0 ? Math.round((part / base) * 100) : null);

export const formatCount = (value: number) => value.toLocaleString("pt-BR");

/** Quanto da campanha já saiu da fila (enviados, falhas, ignorados e cancelados). */
export const progressOf = (totals: BroadcastTotals) =>
  totals.total > 0 ? Math.round(((totals.total - totals.pending) / totals.total) * 100) : 0;

// Valor aproximado por mensagem entregue para números do Brasil, em dólar, pela tabela pública da Meta.
// A Meta muda os preços; a estimativa serve só de referência antes de disparar.
const PRICE_PER_MESSAGE_USD: Record<string, number> = {
  MARKETING: 0.0625,
  UTILITY: 0.0068,
  AUTHENTICATION: 0.0315,
};

export const estimateCostUsd = (category: string | null, recipients: number) => {
  const price = category ? PRICE_PER_MESSAGE_USD[category] : undefined;
  return price === undefined ? null : price * recipients;
};

export const formatUsd = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "USD" }).format(value);

/** Telefone no formato que o back grava (+55 11 99999-8888), para tirar repetidos antes de enviar. */
export const normalizePhone = (raw: string) => {
  const value = raw.trim();
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value) ?? parsePhoneNumberFromString(value, "BR");
  if (!parsed || !isValidPhoneNumber(parsed.number)) return null;
  return parsed.formatInternational();
};

/** Lê CSV separado por vírgula ou ponto e vírgula, com aspas. A primeira linha é o cabeçalho. */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < clean.length; index++) {
    const char = clean[index];
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') {
        field += '"';
        index++;
      } else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[index + 1] === "\n") index++;
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);

  const [headers = [], ...data] = rows;
  return { headers, rows: data };
}

/** Uma pessoa do público, venha das etiquetas, do funil, da planilha ou da lista colada. */
export type AudienceRow = {
  phoneNumber: string;
  name: string | null;
  surname: string | null;
  dealTitle: string | null;
  fields: Record<string, string>;
  columns: Record<string, string>;
};

export type VariableSource =
  | { kind: "fixed"; value: string }
  | { kind: "name" }
  | { kind: "firstName" }
  | { kind: "surname" }
  | { kind: "dealTitle" }
  | { kind: "crmField"; fieldId: string }
  | { kind: "column"; column: string };

export type VariableMapping = { source: VariableSource; fallback: string };

export const sourceKey = (source: VariableSource) => {
  switch (source.kind) {
    case "crmField":
      return `crmField:${source.fieldId}`;
    case "column":
      return `column:${source.column}`;
    default:
      return source.kind;
  }
};

export const sourceFromKey = (key: string, fixedValue = ""): VariableSource => {
  if (key.startsWith("crmField:")) return { kind: "crmField", fieldId: key.slice("crmField:".length) };
  if (key.startsWith("column:")) return { kind: "column", column: key.slice("column:".length) };
  if (key === "name" || key === "firstName" || key === "surname" || key === "dealTitle") return { kind: key };
  return { kind: "fixed", value: fixedValue };
};

const readSource = (row: AudienceRow, source: VariableSource) => {
  switch (source.kind) {
    case "fixed":
      return source.value;
    case "name":
      return row.name ?? "";
    case "firstName":
      return (row.name ?? "").trim().split(/[\s,;]+/)[0] ?? "";
    case "surname":
      return row.surname ?? "";
    case "dealTitle":
      return row.dealTitle ?? "";
    case "crmField":
      return row.fields[source.fieldId] ?? "";
    case "column":
      return row.columns[source.column] ?? "";
  }
};

/** Valor de cada variável para a pessoa; nulo quando falta algum e não há valor reserva. */
export function resolveVariables(
  row: AudienceRow,
  parameters: WhatsappTemplateParameter[],
  mapping: Record<string, VariableMapping>,
): Record<string, string> | null {
  const variables: Record<string, string> = {};
  for (const parameter of parameters) {
    const item = mapping[parameter.key];
    const value = (item ? readSource(row, item.source) : "").trim() || item?.fallback.trim() || "";
    if (!value) return null;
    variables[parameter.key] = value;
  }
  return variables;
}

export type AudienceSummary = {
  ready: { row: AudienceRow; variables: Record<string, string> }[];
  duplicates: number;
  invalid: number;
  missingVariables: number;
};

/** Junta as fontes, tira repetidos e inválidos e preenche as variáveis. */
export function summarizeAudience(
  rows: AudienceRow[],
  parameters: WhatsappTemplateParameter[],
  mapping: Record<string, VariableMapping>,
): AudienceSummary {
  const seen = new Set<string>();
  const summary: AudienceSummary = { ready: [], duplicates: 0, invalid: 0, missingVariables: 0 };

  for (const row of rows) {
    const phone = normalizePhone(row.phoneNumber);
    if (!phone) {
      summary.invalid++;
      continue;
    }
    if (seen.has(phone)) {
      summary.duplicates++;
      continue;
    }
    seen.add(phone);

    const variables = resolveVariables(row, parameters, mapping);
    if (!variables) {
      summary.missingVariables++;
      continue;
    }
    summary.ready.push({ row: { ...row, phoneNumber: phone }, variables });
  }

  return summary;
}

/** Lista colada: um número por linha, com o nome depois de vírgula, ponto e vírgula ou tabulação. */
export function parsePastedList(text: string): AudienceRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [phone, ...rest] = line.split(/[;,\t]/);
      const name = rest.join(" ").trim() || null;
      return { phoneNumber: phone.trim(), name, surname: null, dealTitle: null, fields: {}, columns: {} };
    });
}

export const RECIPIENTS_PER_REQUEST = 5000;

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"] as const;

/** Segunda a sexta, das 8h às 20h. */
export const defaultSendWindow: BroadcastSendWindow = { startMinute: 8 * 60, endMinute: 20 * 60, days: [1, 2, 3, 4, 5] };

export const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

export const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
};

/** "Seg a Sex, das 08:00 às 20:00" ou a lista de dias quando não são seguidos. */
export const describeSendWindow = (window: BroadcastSendWindow) => {
  const days = [...window.days].sort((a, b) => a - b);
  const consecutive = days.length > 2 && days.every((day, index) => index === 0 || day === days[index - 1] + 1);
  const dayText =
    days.length === 7
      ? "Todos os dias"
      : consecutive
        ? `${WEEKDAYS[days[0]]} a ${WEEKDAYS[days.at(-1)!]}`
        : days.map((day) => WEEKDAYS[day]).join(", ");
  return `${dayText}, das ${minutesToTime(window.startMinute)} às ${minutesToTime(window.endMinute)}`;
};

export const sendWindowError = (window: BroadcastSendWindow | null) => {
  if (!window) return null;
  if (window.startMinute >= window.endMinute) return "O fim precisa ser depois do início";
  if (!window.days.length) return "Escolha pelo menos um dia";
  return null;
};

/** Valor para o campo datetime-local, no horário do aparelho. */
export const toLocalInputValue = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

/** O horário escolhido é pelo menos um minuto no futuro, como o back exige. */
export const isFutureSchedule = (value: string) => {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now() + 60 * 1000;
};

/** Custo aproximado das mensagens que a Meta marcou como cobradas, pela mesma tabela da estimativa. */
export const billedCostUsd = (billable: Record<string, number>) => {
  let total = 0;
  let known = false;
  for (const [category, count] of Object.entries(billable)) {
    const cost = estimateCostUsd(category, count);
    if (cost === null) continue;
    total += cost;
    known = true;
  }
  return known ? total : null;
};

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? "" : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Planilha com ponto e vírgula, que o Excel em português abre direto. */
export function recipientsToCsv(recipients: BroadcastRecipient[]) {
  const header = ["Telefone", "Nome", "Status", "Motivo", "Enviado em", "Entregue em", "Lido em", "Respondeu em", "Descadastrou em"];
  const date = (value: string | null) => (value ? new Date(value).toLocaleString("pt-BR") : "");
  const lines = recipients.map((recipient) =>
    [
      recipient.phoneNumber,
      recipient.name,
      recipientStatusInfo[recipient.status].label,
      recipient.errorMessage ?? (recipient.skipReason ? skipReasonLabel[recipient.skipReason] : ""),
      date(recipient.sentAt),
      date(recipient.deliveredAt),
      date(recipient.readAt),
      date(recipient.repliedAt),
      date(recipient.optedOutAt),
    ]
      .map(csvCell)
      .join(";"),
  );
  return "\uFEFF" + [header.join(";"), ...lines].join("\r\n");
}

/**
 * Leva a pessoa ao campo que falta preencher (rola até ele e dá foco).
 * Usado quando ela toca em um botão de avançar/salvar que está bloqueado.
 */
export const focusPendingField = (id: string | null | undefined) => {
  if (!id) return;
  const element = document.getElementById(id);
  if (!element) return;
  element.scrollIntoView({ behavior: "smooth", block: "center" });
  element.focus({ preventScroll: true });
};
