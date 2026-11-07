import { stageFlowResultLabel } from "../crmUtils";

const fieldLabel: Record<string, string> = {
  title: "título",
  value: "valor",
  notes: "notas",
  ownerUserId: "responsável",
  contact: "telefone do contato",
};

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
    case "EMAIL_CLICKED":
      return `Clicou no e-mail da campanha "${payload.campaignName}"`;
  }
};
