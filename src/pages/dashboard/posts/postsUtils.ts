export const socialFormatLabel: Record<SocialPostFormat, string> = {
  IMAGE: "Imagem",
  CAROUSEL: "Carrossel",
  REEL: "Reel",
  STORY: "Story",
};

// Onde cada formato aparece, para o usuário entender o que está criando
export const socialFormatPlacement: Record<SocialPostFormat, string> = {
  IMAGE: "Feed",
  CAROUSEL: "Feed",
  REEL: "Reels e feed",
  STORY: "Stories · 24 horas",
};

export const socialPlatformLabel: Record<SocialPlatform, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
};

export const socialStatusInfo: Record<SocialPostStatus, { label: string; className: string }> = {
  GENERATING: { label: "Gerando com IA", className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200" },
  READY: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  SCHEDULED: { label: "Agendada", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200" },
  PUBLISHING: { label: "Publicando", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  PUBLISHED: { label: "Publicada", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
  PARTIAL: { label: "Publicada em parte", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
  FAILED: { label: "Falhou", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" },
};

// Rótulos dos resultados das postagens, em linguagem simples
export const socialInsightLabel: Record<keyof SocialPostInsights, string> = {
  reach: "Pessoas alcançadas",
  impressions: "Visualizações",
  reactions: "Curtidas e reações",
  comments: "Comentários",
  shares: "Compartilhamentos",
  saved: "Salvos",
  clicks: "Cliques",
};

export const formatCount = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : value.toLocaleString("pt-BR");

/** Linha curta para o card: alcance · reações · comentários, só o que a rede informou. */
export const insightsSummary = (insights: SocialPostInsights | null | undefined) => {
  if (!insights) return null;
  const parts = [
    insights.reach !== null ? `${formatCount(insights.reach)} alcançadas` : null,
    insights.reactions !== null ? `${formatCount(insights.reactions)} curtidas` : null,
    insights.comments !== null ? `${formatCount(insights.comments)} comentários` : null,
    insights.shares ? `${formatCount(insights.shares)} compart.` : null,
    insights.saved ? `${formatCount(insights.saved)} salvos` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

/** Soma das redes de uma postagem (a tela usa no card da lista). */
export const sumTargetInsights = (targets: SocialPostTarget[]): SocialPostInsights | null => {
  const withData = targets.filter((target) => target.insights);
  if (!withData.length) return null;
  const keys = Object.keys(socialInsightLabel) as (keyof SocialPostInsights)[];
  const total = Object.fromEntries(keys.map((key) => [key, null])) as SocialPostInsights;
  for (const target of withData)
    for (const key of keys) {
      const value = target.insights![key];
      if (value !== null && value !== undefined) total[key] = (total[key] ?? 0) + value;
    }
  return total;
};

export const socialApprovalInfo: Record<SocialPostApproval, { label: string; className: string }> = {
  PENDING: { label: "Aguardando aprovação", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  CHANGES: { label: "Ajuste pedido", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" },
};

export const socialScopeLabel: Record<string, string> = {
  pages_manage_posts: "publicar na página",
  pages_read_engagement: "ler as postagens da página",
  pages_show_list: "listar as páginas",
  instagram_basic: "ler o Instagram",
  instagram_content_publish: "publicar no Instagram",
};

/** Algo da postagem ainda está sendo feito em segundo plano: a tela atualiza sozinha. */
export const isSocialPostBusy = (post: SocialPost) =>
  post.status === "GENERATING" ||
  post.status === "PUBLISHING" ||
  post.media.some((media) => media.status === "QUEUED" || media.status === "RUNNING");

export const editableStatuses: SocialPostStatus[] = ["READY", "FAILED", "SCHEDULED", "PARTIAL"];

export const socialTextareaClassName =
  "border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring min-h-24 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

/** Data local no formato do input datetime-local. */
export const toLocalInputValue = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};
