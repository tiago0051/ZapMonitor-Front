export const dateAutomationActionLabel: Record<DateAutomationAction, string> = {
  WHATSAPP_TEMPLATE: "Mandar modelo de WhatsApp",
  SEQUENCE: "Inscrever em sequência de e-mail",
  TASK: "Criar tarefa no negócio",
};

export const dateAutomationSourceLabel: Record<DateAutomationSource, string> = {
  CONTACT_FIELD: "Campo de data da ficha",
  DEAL_FIELD: "Campo de data do negócio",
  CONTACT_CREATED: "Data de cadastro da ficha",
};

/** "3 dias antes de Aniversário, todo ano" ou "no dia do cadastro". */
export const describeDateTrigger = (automation: Pick<DateAutomation, "offsetDays" | "yearly" | "dateSource">, fieldName: string | null) => {
  const target = automation.dateSource === "CONTACT_CREATED" ? "do cadastro" : `de ${fieldName ?? "um campo removido"}`;
  const days = Math.abs(automation.offsetDays);
  const when =
    automation.offsetDays === 0
      ? `No dia ${target}`
      : `${days} ${days === 1 ? "dia" : "dias"} ${automation.offsetDays < 0 ? "antes" : "depois"} ${target}`;
  return `${when}${automation.yearly ? ", todo ano" : ""}`;
};

export const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;
