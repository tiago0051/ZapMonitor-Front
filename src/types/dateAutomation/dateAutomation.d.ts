// De qual data parte: campo de data da ficha, campo de data do negócio ou o cadastro da ficha
type DateAutomationSource = "CONTACT_FIELD" | "DEAL_FIELD" | "CONTACT_CREATED";
type DateAutomationAction = "WHATSAPP_TEMPLATE" | "SEQUENCE" | "TASK";

type DateAutomationActionConfig =
  | { configurationId: string; templateId: string; mapping: Record<string, unknown>; headerFileId: string | null }
  | { sequenceId: string }
  | { title: string; dueInDays: number };

type DateAutomation = {
  id: string;
  name: string;
  active: boolean;
  dateSource: DateAutomationSource;
  fieldId: string | null;
  // Negativo = antes da data, positivo = depois, 0 = no dia
  offsetDays: number;
  // Todo ano no mesmo dia e mês (aniversário)
  yearly: boolean;
  onlyOpenDeals: boolean;
  // Hora do fuso da empresa a partir da qual roda
  sendHour: number;
  action: DateAutomationAction;
  actionConfig: DateAutomationActionConfig;
  lastRunDate: string | null;
  lastRunAt: string | null;
  lastRunCount: number | null;
  lastRunError: string | null;
  createdAt: string;
  updatedAt: string;
};

type DateAutomationInput = Omit<
  DateAutomation,
  "id" | "active" | "lastRunDate" | "lastRunAt" | "lastRunCount" | "lastRunError" | "createdAt" | "updatedAt"
>;
