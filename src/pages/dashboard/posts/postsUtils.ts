export const socialFormatLabel: Record<SocialPostFormat, string> = {
  IMAGE: "Imagem",
  CAROUSEL: "Carrossel",
  REEL: "Reel",
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
