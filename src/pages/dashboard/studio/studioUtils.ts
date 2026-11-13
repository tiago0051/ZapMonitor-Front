export const creativeKindLabel: Record<CreativeKind, string> = { IMAGE: "Imagem", VIDEO: "Vídeo" };

export const creativePurposeLabel: Record<CreativePurpose, string> = {
  AD: "Anúncio",
  POST: "Postagem",
  FREE: "Livre",
};

export const creativePurposeHint: Record<CreativePurpose, string> = {
  AD: "Para campanhas pagas no Facebook e Instagram",
  POST: "Para o feed e os reels da marca",
  FREE: "Qualquer outra peça",
};

export const imageRatios: { value: CreativeAspectRatio; label: string; hint: string }[] = [
  { value: "1:1", label: "Quadrado", hint: "1:1 · feed e anúncios" },
  { value: "4:5", label: "Retrato", hint: "4:5 · feed do Instagram" },
  { value: "9:16", label: "Vertical", hint: "9:16 · stories e reels" },
  { value: "16:9", label: "Horizontal", hint: "16:9 · YouTube e site" },
];

export const videoRatios = imageRatios.filter((ratio) => ratio.value === "9:16" || ratio.value === "16:9");

export const ratioClassName: Record<CreativeAspectRatio, string> = {
  "1:1": "aspect-square",
  "4:5": "aspect-[4/5]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-video",
};

/** Formato padrão para cada destino quando o usuário ainda não escolheu. */
export const defaultRatio = (kind: CreativeKind, purpose: CreativePurpose): CreativeAspectRatio =>
  kind === "VIDEO" ? "9:16" : purpose === "POST" ? "4:5" : "1:1";

export const isGenerationBusy = (generation: CreativeGeneration) => generation.status === "QUEUED" || generation.status === "RUNNING";

export const changeExamples = [
  "Troque o fundo por um ambiente mais claro",
  "Deixe o texto maior e mais legível",
  "Mude a cor do texto para a cor da marca",
  "Aproxime mais o produto",
  "Tire o texto da imagem",
];

export const briefExamples: Record<CreativeKind, string[]> = {
  IMAGE: [
    "Sofá das fotos em uma sala moderna e iluminada, com o texto “Frete grátis” no topo",
    "Produto em destaque sobre fundo na cor da marca, com o preço “R$ 199” grande",
    "Foto lifestyle do produto sendo usado em casa, sem texto",
  ],
  VIDEO: [
    "Câmera girando devagar em volta do produto das fotos, em uma sala aconchegante",
    "Antes e depois: ambiente vazio e depois com o móvel das fotos, texto “Transforme sua casa”",
  ],
};

export const BASE_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
export const MAX_BASE_IMAGES = 6;
