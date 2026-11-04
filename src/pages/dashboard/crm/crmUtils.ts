import { formatPhoneNumber } from "@/utils/formatString";
import { differenceInDays } from "date-fns";

export const crmSelectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

export const crmTextareaClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

// Cores sugeridas para novas etapas, na ordem em que são criadas
export const stageColorOptions = ["#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899", "#64748b", "#22c55e", "#ef4444"];

export const dealStatusLabel: Record<DealStatus, string> = {
  OPEN: "Aberto",
  WON: "Ganho",
  LOST: "Perdido",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatCurrency = (value: number) => currencyFormatter.format(value);

export const dealContactName = (contact: DealContact) =>
  contact.surname?.trim() || contact.name?.trim() || formatPhoneNumber(contact.phoneNumber);

export const sumDealValues = (deals: Deal[]) => deals.reduce((total, deal) => total + (deal.value ?? 0), 0);

export const findPipelineStage = (pipeline: Pipeline | undefined, stageId: string | null) =>
  pipeline?.stages.find((stage) => stage.id === stageId);

// Link para a conversa do contato na tela de atendimento
export const contactChatPath = (baseUrl: string, contact: DealContact) =>
  `${baseUrl}/whatsapp?contactId=${contact.id}&phone=${encodeURIComponent(contact.phoneNumber)}`;

/** Dias sem atividade de um negócio aberto que passou do prazo da etapa; nulo quando não está esfriando. */
export const staleDays = (deal: Deal, stage: PipelineStage | undefined) => {
  if (deal.status !== "OPEN" || !stage?.staleAfterDays) return null;

  const days = differenceInDays(new Date(), new Date(deal.lastActivityAt));

  return days >= stage.staleAfterDays ? days : null;
};

export const stageFlowResultLabel: Record<StageFlowResult, string> = {
  STARTED: "iniciado",
  FLOW_INACTIVE: "não rodou porque o fluxo está desativado",
  OUTSIDE_WINDOW: "não rodou porque o contato não escreveu nas últimas 24h",
  SERVICE_LIMIT: "não rodou porque o plano atingiu o limite de atendimentos",
  FAILED: "falhou ao rodar",
};

export const crmFieldTypeLabel: Record<CrmFieldType, string> = {
  TEXT: "Texto",
  NUMBER: "Número",
  DATE: "Data",
  SELECT: "Lista de opções",
};

export const isFieldFilled = (value: unknown) => value !== undefined && value !== null && value !== "";

/** Campos ativos que a etapa exige e que o negócio ainda não tem preenchidos. */
export const missingRequiredFields = (deal: Deal, stage: PipelineStage, activeFields: CrmField[]) =>
  activeFields.filter((field) => stage.requiredFieldIds.includes(field.id) && !isFieldFilled(deal.customFields[field.id]));

export const formatFieldValue = (field: CrmField, value: string | number | undefined) => {
  if (!isFieldFilled(value)) return "—";
  if (field.type === "DATE") return String(value).split("-").reverse().join("/");
  if (field.type === "NUMBER") return Number(value).toLocaleString("pt-BR");

  return String(value);
};

/** Valores do formulário para a API: número vira número e vazio vira nulo, que apaga o valor. */
export const toCustomFieldsBody = (fields: CrmField[], values: Record<string, string>) =>
  Object.fromEntries(
    fields.map((field) => {
      const value = values[field.id]?.trim() ?? "";
      if (!value) return [field.id, null];

      return [field.id, field.type === "NUMBER" ? Number(value) : value];
    }),
  ) as Record<string, string | number | null>;

export const toCustomFieldsForm = (fields: CrmField[], customFields: Deal["customFields"]) =>
  Object.fromEntries(fields.map((field) => [field.id, customFields[field.id] === undefined ? "" : String(customFields[field.id])]));

// Faixas da nota de IA; descrevem a chance de ganho, não um estado de alerta
export const aiScoreLabel = (score: number) => (score >= 70 ? "Quente" : score >= 40 ? "Morno" : "Frio");

export const dealOriginLabel: Record<DealOriginType, string> = {
  AD_MESSAGE: "Anúncio no WhatsApp",
  LEAD_FORM: "Formulário de cadastro",
};

// Nomes dos eventos padrão da Meta
export const conversionEventLabel: Record<ConversionEventName, string> = {
  LEAD_SUBMITTED: "Lead (LeadSubmitted)",
  QUALIFIED_LEAD: "Lead qualificado (QualifiedLead)",
  PURCHASE: "Compra (Purchase)",
};
