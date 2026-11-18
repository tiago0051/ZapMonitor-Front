export const textareaClassName =
  "border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

export type AiAgentStyle = "precise" | "balanced" | "creative";

// O dono escolhe o jeito de responder; a temperatura fica fixa por trás de cada opção
export const AI_AGENT_STYLES: { value: AiAgentStyle; label: string; description: string; temperature: number }[] = [
  { value: "precise", label: "Preciso", description: "Respostas diretas e sempre parecidas. Bom para regras, preços e prazos.", temperature: 0.2 },
  { value: "balanced", label: "Equilibrado", description: "Natural sem fugir do assunto. Serve para a maioria dos casos.", temperature: 0.7 },
  { value: "creative", label: "Criativo", description: "Mais variado e caloroso. Bom para vendas e conversa leve.", temperature: 1 },
];

/** Agentes antigos podem ter qualquer temperatura: mostra o estilo mais próximo. */
export const styleFromTemperature = (temperature: number): AiAgentStyle =>
  AI_AGENT_STYLES.reduce((closest, style) =>
    Math.abs(style.temperature - temperature) < Math.abs(closest.temperature - temperature) ? style : closest,
  ).value;

export const temperatureFromStyle = (style: AiAgentStyle) => AI_AGENT_STYLES.find((item) => item.value === style)?.temperature ?? 0.7;

export const styleLabel = (temperature: number) => AI_AGENT_STYLES.find((item) => item.value === styleFromTemperature(temperature))?.label;
