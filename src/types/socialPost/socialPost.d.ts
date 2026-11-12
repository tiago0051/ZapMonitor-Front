type SocialPostFormat = "IMAGE" | "CAROUSEL" | "REEL";
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
  about: string | null;
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
