type CreativeKind = "IMAGE" | "VIDEO";
type CreativePurpose = "AD" | "POST" | "FREE";
type CreativeAspectRatio = "1:1" | "4:5" | "9:16" | "16:9";
type CreativeGenerationStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

type CreativeBaseImage = { id: string; name: string; mimeType: string; url: string };

type CreativeGeneration = {
  id: string;
  projectId: string;
  // Versão de origem quando é uma alteração
  parentId: string | null;
  number: number;
  kind: CreativeKind;
  // Alteração pedida; nula na primeira geração
  instruction: string | null;
  prompt: string | null;
  status: CreativeGenerationStatus;
  mimeType: string | null;
  error: string | null;
  favorite: boolean;
  createdAt: string;
  // Link temporário do arquivo pronto
  url: string | null;
};

type CreativeProject = {
  id: string;
  title: string;
  kind: CreativeKind;
  purpose: CreativePurpose;
  brief: string;
  aspectRatio: CreativeAspectRatio;
  durationSeconds: number | null;
  useBrand: boolean;
  baseImages: CreativeBaseImage[];
  generations: CreativeGeneration[];
  createdAt: string;
  updatedAt: string;
};

type CreativeProjectSummary = {
  id: string;
  title: string;
  kind: CreativeKind;
  purpose: CreativePurpose;
  aspectRatio: CreativeAspectRatio;
  versions: number;
  running: boolean;
  cover: { kind: CreativeKind; url: string | null } | null;
  createdAt: string;
  updatedAt: string;
};

// Valores iniciais de um criativo novo aberto a partir de outra tela (postagem ou anúncio)
type CreativeProjectDefaults = {
  kind?: CreativeKind;
  purpose?: CreativePurpose;
  aspectRatio?: CreativeAspectRatio;
  brief?: string;
  // Trava o tipo (ex.: reel só aceita vídeo)
  lockKind?: boolean;
};
