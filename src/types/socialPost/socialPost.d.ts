type SocialPostApproval = "PENDING" | "CHANGES";

type SocialPostFormat = "IMAGE" | "CAROUSEL" | "REEL" | "STORY";

// Mídia do story: imagem gerada pela IA ou vídeo com roteiro
type SocialStoryMedia = "IMAGE" | "VIDEO";
type SocialPlatform = "FACEBOOK" | "INSTAGRAM";
type SocialPostStatus = "GENERATING" | "READY" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "PARTIAL" | "FAILED";
type SocialMediaStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";
type SocialTargetStatus = "PENDING" | "PUBLISHING" | "PUBLISHED" | "FAILED";

type SocialScriptScene = { tempo?: string; fala?: string; legenda?: string; imagem?: string };

type SocialScript = {
  titulo?: string;
  gancho?: string;
  cenas?: SocialScriptScene[];
  chamada?: string;
  duracaoSegundos?: number;
  porQue?: string;
};

type SocialPostMedia = {
  id: string;
  postId: string;
  position: number;
  kind: "IMAGE" | "VIDEO";
  origin: "GENERATED" | "UPLOADED";
  prompt: string | null;
  status: SocialMediaStatus;
  mimeType: string | null;
  error: string | null;
  // Link temporário do arquivo
  url: string | null;
};

type SocialPostTarget = {
  id: string;
  platform: SocialPlatform;
  status: SocialTargetStatus;
  externalId: string | null;
  permalink: string | null;
  error: string | null;
  publishedAt: string | null;
  // Resultados da rede copiados pela rotina (a cada 6 horas)
  insights?: SocialPostInsights | null;
  insightsAt?: string | null;
};

// Nulo quando a rede não informa a métrica
type SocialPostInsights = {
  reach: number | null;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  shares: number | null;
  saved: number | null;
  clicks: number | null;
};

type SocialPostResults = {
  days: number;
  posts: number;
  total: SocialPostInsights;
  engagement: number;
  items: {
    id: string;
    title: string;
    format: SocialPostFormat;
    platforms: SocialPlatform[];
    publishedAt: string | null;
    thumbnailUrl: string | null;
    thumbnailKind: "IMAGE" | "VIDEO" | null;
    insights: SocialPostInsights;
    engagement: number;
    insightsAt: string | null;
  }[];
};

type SocialPost = {
  id: string;
  idea: string;
  format: SocialPostFormat;
  platforms: SocialPlatform[];
  caption: string | null;
  hashtags: string[];
  script: SocialScript | null;
  status: SocialPostStatus;
  error: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  // Dia previsto no planejamento enquanto não é agendada
  plannedFor?: string | null;
  // Aprovação de quem cria sem poder publicar: PENDING aguardando, CHANGES com ajuste pedido; nulo sem pedido aberto
  approvalStatus: SocialPostApproval | null;
  approvalNote: string | null;
  approvalRequestedByUserId: string | null;
  approvalRequestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  media: SocialPostMedia[];
  targets: SocialPostTarget[];
};

type SocialPostSetup = {
  connected: boolean;
  metaPageId: string | null;
  pageName: string | null;
  instagramAccountId: string | null;
  instagramUsername: string | null;
  hasIdentity: boolean;
  missingScopes: Record<SocialPlatform, string[]>;
};

type BrandIdentityData = {
  colors: string[];
  visualStyle: string;
  logoDescription: string;
  engagingThemes: string[];
  summary: string;
};

type BrandSourceStatus = "OK" | "MISSING_PERMISSION" | "NOT_LINKED" | "FAILED";

type BrandReferencePost = {
  platform: SocialPlatform;
  caption: string | null;
  mediaUrl: string | null;
  permalink: string | null;
  likes: number;
  comments: number;
  shares: number;
  postedAt: string | null;
};

// Identidade da marca do cliente, uma só para postagens, e-mails e anúncios
type BrandIdentity = {
  clientId: string;
  metaPageId: string | null;
  pageName: string | null;
  instagramAccountId: string | null;
  instagramUsername: string | null;
  // Base da marca: o que vende, para quem, regras e diferenciais
  about: string | null;
  // Perfil montado pela IA a partir da base e revisado pelo usuário
  profile: AdBrandProfileData | null;
  profileUpdatedAt: string | null;
  // Arquivos da base, já lidos como texto
  files: AdBrandSource[];
  fixedHashtags: string[];
  logoUploaded: boolean;
  hasLogo: boolean;
  logoUrl: string | null;
  identity: BrandIdentityData | null;
  posts: BrandReferencePost[];
  sources: { page: BrandSourceStatus; facebookPosts: BrandSourceStatus; instagram: BrandSourceStatus; details: string[] } | null;
  status: "PENDING" | "SYNCING" | "DONE" | "FAILED";
  error: string | null;
  identityUpdatedAt: string | null;
};

type BrandPage = { id: string; name: string; canPublish: boolean };
