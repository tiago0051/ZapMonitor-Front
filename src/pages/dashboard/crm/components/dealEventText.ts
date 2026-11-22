import { stageFlowResultLabel } from "../crmUtils";

const fieldLabel: Record<string, string> = {
  title: "título",
  value: "valor",
  notes: "notas",
  ownerUserId: "responsável",
  contact: "telefone do contato",
};

const proposalViaLabel: Record<string, string> = { WHATSAPP: "WhatsApp", EMAIL: "e-mail", LINK: "link" };

export const activityTypeLabel: Record<DealActivityType, string> = {
  CALL: "Ligação",
  MEETING: "Reunião",
  NOTE: "Nota",
  EMAIL: "E-mail",
  WHATSAPP: "WhatsApp",
};

/** Texto livre da atividade registrada, mostrado abaixo da frase; nulo para os outros eventos. */
export const eventDetail = (event: Pick<DealEvent, "type" | "payload">) =>
  event.type === "ACTIVITY_LOGGED" ? ((event.payload?.text as string | null | undefined) ?? null) : null;

/** Frase do histórico do negócio; usada na ficha do negócio e na linha do tempo do contato. */
export const describeEvent = (event: Pick<DealEvent, "type" | "payload">) => {
  const payload = (event.payload ?? {}) as Record<string, string | string[] | null>;

  switch (event.type) {
    case "CREATED":
      return `Criou o negócio em ${payload.stageName}`;
    case "STAGE_CHANGED":
      return `Moveu de ${payload.fromStageName ?? "—"} para ${payload.stageName}${payload.lostReason ? ` (motivo: ${payload.lostReason})` : ""}`;
    case "GROUP_CHANGED":
      return `Transferiu de ${payload.fromServiceGroupName ?? "sem grupo"} para ${payload.serviceGroupName ?? "sem grupo"}`;
    case "REOPENED":
      return `Reabriu o negócio em ${payload.stageName}`;
    case "FLOW_TRIGGERED":
      return `Fluxo da etapa ${payload.flowName ? `"${payload.flowName}" ` : ""}${stageFlowResultLabel[payload.result as StageFlowResult] ?? ""}`;
    case "UPDATED":
      if (payload.fieldNames) return `Alterou os campos ${(payload.fieldNames as string[]).join(", ")}`;

      return `Alterou ${((payload.fields as string[]) ?? []).map((field) => fieldLabel[field] ?? field).join(", ")}`;
    case "TASK_CREATED":
      return `Criou a tarefa "${payload.taskTitle}"`;
    case "TASK_COMPLETED":
      return `Concluiu a tarefa "${payload.taskTitle}"`;
    case "ACTIVITY_LOGGED": {
      const label = activityTypeLabel[payload.activityType as DealActivityType] ?? "Atividade";
      return payload.outcome ? `${label}: ${payload.outcome}` : `Registrou ${label.toLowerCase()}`;
    }
    case "EMAIL_CLICKED":
      return `Clicou no e-mail da campanha "${payload.campaignName}"`;
    case "PROPOSAL": {
      const number = `proposta nº ${payload.number}`;
      if (payload.action === "SENT")
        return `Enviou a ${number}${payload.via ? ` (${proposalViaLabel[payload.via as string] ?? payload.via})` : ""}`;
      if (payload.action === "VIEWED") return `O cliente abriu a ${number}`;
      if (payload.action === "ACCEPTED") return `O cliente aceitou a ${number}`;
      if (payload.action === "DECLINED") return `O cliente recusou a ${number}`;
      return `Atualizou a ${number}`;
    }
    case "HANDOFF": {
      const flag = (payload as Record<string, unknown>).qualified;
      const qualified = flag === true ? " — lead qualificado" : flag === false ? " — ainda não qualificado" : "";
      return `O agente de IA passou a conversa para um atendente (${payload.outputLabel})${qualified}`;
    }
  }
};
