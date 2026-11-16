import { CalendarCheck, Image, Mail, Megaphone, MessageSquareText, Send, Workflow, type LucideIcon } from "lucide-react";

export const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

export const textareaClassName =
  "border-input dark:bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

export const goalLabel: Record<MarketingGoal, string> = {
  SALES: "Vender mais agora",
  LEADS: "Gerar contatos interessados",
  LAUNCH: "Lançar um produto novo",
  AWARENESS: "Ficar conhecido na região ou no nicho",
  RECURRENCE: "Fazer clientes comprarem de novo",
};

export const channelOptions: { value: MarketingChannel; label: string; requiresAds?: boolean }[] = [
  { value: "META_ADS", label: "Anúncios na Meta (Facebook e Instagram)", requiresAds: true },
  { value: "GOOGLE_ADS", label: "Anúncios no YouTube", requiresAds: true },
  { value: "TIKTOK_ADS", label: "Anúncios no TikTok", requiresAds: true },
  { value: "SOCIAL", label: "Postagens no Instagram e Facebook", requiresAds: true },
  { value: "WHATSAPP_BASE", label: "Disparos para a base no WhatsApp" },
  { value: "EMAIL", label: "E-mail marketing" },
];

export const actionInfo: Record<MarketingStepAction, { label: string; icon: LucideIcon }> = {
  AD_CAMPAIGN: { label: "Campanha de anúncio", icon: Megaphone },
  SOCIAL_POST: { label: "Postagem", icon: Image },
  FLOW: { label: "Fluxo de atendimento", icon: Workflow },
  BROADCAST: { label: "Disparo no WhatsApp", icon: Send },
  EMAIL_CAMPAIGN: { label: "Campanha de e-mail", icon: Mail },
  EMAIL_SEQUENCE: { label: "Sequência de e-mails", icon: Mail },
  WHATSAPP_TEMPLATE: { label: "Modelo de WhatsApp", icon: MessageSquareText },
  TASK: { label: "Tarefa", icon: CalendarCheck },
};

export const stepStatusInfo: Record<MarketingStepStatus, { label: string; className: string }> = {
  TODO: { label: "A fazer", className: "bg-muted text-muted-foreground" },
  DOING: { label: "Fazendo", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  DONE: { label: "Feito", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  SKIPPED: { label: "Pulado", className: "bg-muted text-muted-foreground line-through" },
};

export const strategyStatusInfo: Record<MarketingStrategyStatus, { label: string; className: string }> = {
  GENERATING: { label: "Montando", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  READY: { label: "Em andamento", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  FAILED: { label: "Falhou", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  ARCHIVED: { label: "Arquivada", className: "bg-muted text-muted-foreground" },
};

export const linkKindLabel: Record<MarketingLinkKind, string> = {
  AD_DRAFT: "Rascunho de campanha",
  AD_VIDEO_CAMPAIGN: "Campanha de vídeo",
  AD_CAMPAIGN: "Campanha no ar",
  SOCIAL_POST: "Postagem",
  PLANNER_TASK: "Tarefa no Planejamento",
  FLOW: "Fluxo",
  BROADCAST: "Disparo",
  EMAIL_CAMPAIGN: "Campanha de e-mail",
  EMAIL_SEQUENCE: "Sequência de e-mails",
  WHATSAPP_TEMPLATE: "Modelo de WhatsApp",
};

export const linkSourceLabel: Record<MarketingLinkSource, string> = {
  PILOT: "pelo piloto",
  SHORTCUT: "pelo atalho do passo",
  MARKER: "pela marca no nome",
  PUBLISHED: "pela publicação",
  MANUAL: "ligada à mão",
};

export const verdictInfo: Record<MarketingVerdict, { label: string; className: string }> = {
  VALIDATED: { label: "Validada", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  TESTING: { label: "Em teste", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  NOT_VALIDATED: { label: "Não validada", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  NO_DATA: { label: "Sem dados", className: "bg-muted text-muted-foreground" },
};

export const recommendationLabel: Record<ReviewRecommendation["kind"], string> = {
  ADVANCE: "Avançar",
  ADJUST: "Ajustar",
  PAUSE: "Pausar",
  SWITCH_PLAYBOOK: "Trocar de estratégia",
};

export const formatMoney = (value: number | null | undefined, currency?: string | null) =>
  value === null || value === undefined
    ? "—"
    : new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency || "BRL", maximumFractionDigits: 2 }).format(value);

/** Onde abrir cada item ligado. */
export function linkTarget(baseUrl: string, link: Pick<MarketingStrategyLink, "kind" | "objectId">) {
  switch (link.kind) {
    case "SOCIAL_POST":
      return `${baseUrl}/posts/${link.objectId}`;
    case "PLANNER_TASK":
      return `${baseUrl}/planner`;
    case "FLOW":
      return `${baseUrl}/configuration/flow/${link.objectId}`;
    case "BROADCAST":
      return `${baseUrl}/broadcasts/${link.objectId}`;
    case "EMAIL_CAMPAIGN":
      return `${baseUrl}/broadcasts/email/${link.objectId}`;
    case "EMAIL_SEQUENCE":
      return `${baseUrl}/broadcasts/sequences/${link.objectId}`;
    case "WHATSAPP_TEMPLATE":
      return `${baseUrl}/configuration?tab=template`;
    case "AD_CAMPAIGN":
      return `${baseUrl}/ads?tab=campaigns`;
    default:
      return `${baseUrl}/ads?tab=create`;
  }
}

// O piloto de anúncios lê ao abrir: o passo que pediu a campanha, para ela nascer marcada
export const PILOT_PREFILL_KEY = "zapmonitor:pilotStrategyPrefill";
export type PilotStrategyPrefill = { clientId: string; strategyStepId: string; label: string; goal: string; notes: string };

export function savePilotPrefill(prefill: PilotStrategyPrefill) {
  try {
    sessionStorage.setItem(PILOT_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // Sem armazenamento, o piloto abre vazio; o usuário ainda pode colar o briefing
  }
}

export function takePilotPrefill(clientId: string): PilotStrategyPrefill | null {
  try {
    const raw = sessionStorage.getItem(PILOT_PREFILL_KEY);
    if (!raw) return null;
    const prefill = JSON.parse(raw) as PilotStrategyPrefill;
    return prefill.clientId === clientId ? prefill : null;
  } catch {
    return null;
  }
}

export function clearPilotPrefill() {
  try {
    sessionStorage.removeItem(PILOT_PREFILL_KEY);
  } catch {
    // nada a limpar
  }
}

/** Copia para a área de transferência; falso quando o navegador recusa. */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
