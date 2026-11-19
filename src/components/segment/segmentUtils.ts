export const emptySegmentRules = (): SegmentRules => ({ match: "ALL", include: [], exclude: [] });

export const segmentConditionLabel: Record<SegmentConditionType, string> = {
  TAG: "Etiqueta",
  DEAL: "Negócio no funil",
  ORIGIN: "Origem do negócio",
  FIELD: "Campo personalizado",
  CREATED: "Data de cadastro",
  CONSENT: "Aceita marketing",
};

// Regras que dependem do CRM somem quando o plano não tem CRM
export const crmConditionTypes: SegmentConditionType[] = ["DEAL", "ORIGIN"];

export const dealStatusLabel: Record<SegmentDealStatus, string> = { OPEN: "Em aberto", WON: "Ganho", LOST: "Perdido" };

export const segmentOriginLabel: Record<SegmentOrigin, string> = {
  AD_MESSAGE: "Anúncio no WhatsApp",
  LEAD_FORM: "Formulário de cadastro",
  BROADCAST: "Disparo de WhatsApp",
  EMAIL_CAMPAIGN: "Campanha de e-mail",
  NONE: "Sem origem registrada",
};

export const newSegmentCondition = (type: SegmentConditionType): SegmentCondition => {
  switch (type) {
    case "TAG":
      return { type, categoryIds: [] };
    case "DEAL":
      return { type, pipelineId: null, stageIds: [], statuses: ["OPEN"] };
    case "ORIGIN":
      return { type, origins: [] };
    case "FIELD":
      return { type, scope: "CONTACT", fieldId: "", operator: "EQUALS", value: "" };
    case "CREATED":
      return { type, withinDays: 30, from: null, to: null };
    case "CONSENT":
      return { type, channel: "WHATSAPP" };
  }
};

/** O que falta numa regra antes de mandar ao servidor. */
export const segmentConditionError = (condition: SegmentCondition): string | null => {
  switch (condition.type) {
    case "TAG":
      return condition.categoryIds.length ? null : "Escolha pelo menos uma etiqueta";
    case "DEAL":
      return condition.statuses.length ? null : "Marque pelo menos uma situação do negócio";
    case "ORIGIN":
      return condition.origins.length ? null : "Escolha pelo menos uma origem";
    case "FIELD":
      if (!condition.fieldId) return "Escolha o campo";
      return condition.operator === "EQUALS" && !condition.value?.trim() ? "Informe o valor do campo" : null;
    case "CREATED":
      if (!condition.withinDays && !condition.from && !condition.to) return "Informe os dias ou as datas";
      return condition.from && condition.to && condition.from > condition.to ? "A data inicial precisa ser antes da final" : null;
    case "CONSENT":
      return null;
  }
};

/** Primeiro problema do segmento; sem nenhuma regra de incluir ele não vale. */
export const segmentRulesError = (rules: SegmentRules): string | null => {
  if (!rules.include.length) return "Inclua pelo menos uma regra de quem entra";
  for (const condition of [...rules.include, ...rules.exclude]) {
    const error = segmentConditionError(condition);
    if (error) return error;
  }
  return null;
};

export const sameSegmentRules = (a: SegmentRules, b: SegmentRules) => JSON.stringify(a) === JSON.stringify(b);
