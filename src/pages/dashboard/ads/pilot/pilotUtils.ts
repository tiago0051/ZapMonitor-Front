export const pilotTextareaClassName = "border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm";

export const identitySourceInfo: Record<AdIdentitySourceStatus, { label: string; className: string }> = {
  OK: { label: "Lido", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  MISSING_PERMISSION: { label: "Sem permissão", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  NOT_LINKED: { label: "Não vinculado", className: "bg-muted text-muted-foreground" },
  FAILED: { label: "Falhou", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

export const verdictInfo: Record<AdCreativeVerdict, { label: string; className: string }> = {
  WINNER: { label: "Vencedor", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  LOSER: { label: "Perdedor", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  LEARNING: { label: "Aprendendo", className: "bg-muted text-muted-foreground" },
};

export const pilotStepLabel: Record<AdPilotStep, string> = {
  IDENTITY: "Lendo a identidade da marca",
  HISTORY: "Lendo o histórico dos anúncios",
  INSIGHTS: "Comparando os criativos",
  PLAN: "Montando a campanha",
  CREATIVES: "Gerando os criativos",
  DRAFT: "Criando o rascunho",
  REVIEW: "Revisando os criativos",
};

export const pilotRunStatusInfo: Record<AdPilotRunStatus, { label: string; className: string }> = {
  RUNNING: { label: "Rodando", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  DONE: { label: "Pronto", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  FAILED: { label: "Falhou", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

export const assetOriginLabel: Record<AdAssetOrigin, string> = {
  UPLOAD: "Enviado",
  GENERATED: "Gerado pela IA",
  POST: "Postagem",
};

// Campos de lista do perfil, um item por linha no formulário
export const profileListFields: { key: keyof AdBrandProfileData; label: string }[] = [
  { key: "products", label: "Produtos" },
  { key: "differentiators", label: "Diferenciais" },
  { key: "offers", label: "Ofertas" },
  { key: "proofs", label: "Provas" },
  { key: "restrictions", label: "Restrições (o que não pode prometer)" },
  { key: "avoidWords", label: "Palavras a evitar" },
];

export const emptyBrandProfile = (): AdBrandProfileData => ({
  business: "",
  products: [],
  audience: "",
  differentiators: [],
  offers: [],
  proofs: [],
  tone: "",
  restrictions: [],
  avoidWords: [],
  summary: "",
});
