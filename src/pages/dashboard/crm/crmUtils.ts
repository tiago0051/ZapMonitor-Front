import { formatPhoneNumber } from "@/utils/formatString";

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
