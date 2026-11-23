export const scriptChannelLabel: Record<SalesScriptChannel, string> = {
  WHATSAPP: "WhatsApp",
  CALL: "Ligação",
  MEETING: "Reunião",
};

export const scriptMethodLabel: Record<SalesScriptMethod, { label: string; description: string }> = {
  CONSULTIVE: { label: "Consultiva", description: "Entende o contexto e a dor antes de apresentar" },
  SPIN: { label: "SPIN", description: "Situação, problema, implicação e necessidade, nessa ordem" },
  BANT: { label: "BANT", description: "Qualifica orçamento, quem decide, necessidade e prazo" },
};

export const emptyStage = (): SalesScriptStage => ({
  key: "",
  name: "",
  goal: "",
  questions: [],
  lines: [],
  advanceSignals: [],
  avoid: [],
  pipelineStageId: null,
});

export const toScriptData = (script: SalesScriptData): SalesScriptData => ({
  name: script.name,
  offerId: script.offerId,
  pipelineId: script.pipelineId,
  channel: script.channel,
  method: script.method,
  stages: script.stages,
  notes: script.notes,
});
