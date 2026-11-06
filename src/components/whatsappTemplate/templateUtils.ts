import { whatsappService } from "@/services/api/whatsappService";
import { BlockBlobClient } from "@azure/storage-blob";

export const templateCategoryLabel: Record<string, string> = {
  MARKETING: "Marketing",
  UTILITY: "Utilidade",
  AUTHENTICATION: "Autenticação",
};

const statusInfo: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "Aprovado", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  PENDING: { label: "Em análise", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  IN_APPEAL: { label: "Em recurso", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  REJECTED: { label: "Recusado", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  PAUSED: { label: "Pausado", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  DISABLED: { label: "Desativado", className: "bg-muted text-muted-foreground" },
};

export const templateStatusInfo = (template: WhatsappTemplate) => {
  if (!template.synced) return { label: "Cadastro manual", className: "bg-muted text-muted-foreground" };
  return statusInfo[template.status ?? ""] ?? { label: template.status ?? "Sem status", className: "bg-muted text-muted-foreground" };
};

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

/** Troca as variáveis pelo valor digitado, pelo exemplo da Meta ou mantém {{n}}. */
export const fillTemplateText = (
  text: string | null,
  prefix: "header" | "body",
  template: WhatsappTemplate,
  variables: Record<string, string> = {},
) =>
  text?.replace(VARIABLE_PATTERN, (match, name: string) => {
    const key = `${prefix}.${name}`;
    const value = variables[key]?.trim();
    if (value) return value;
    return template.parameters.find((parameter) => parameter.key === key)?.example ?? match;
  }) ?? null;

export type TemplateHeaderFileType = "image" | "video" | "document";

export const headerFileType = (template: WhatsappTemplate | null): TemplateHeaderFileType | null => {
  switch (template?.headerFormat) {
    case "IMAGE":
      return "image";
    case "VIDEO":
      return "video";
    case "DOCUMENT":
      return "document";
    default:
      return null;
  }
};

export const headerFileAccept: Record<TemplateHeaderFileType, string> = {
  image: "image/jpeg,image/png",
  video: "video/mp4,video/3gpp",
  document: "application/pdf",
};

export const headerFileLabel: Record<TemplateHeaderFileType, string> = {
  image: "Imagem do cabeçalho",
  video: "Vídeo do cabeçalho",
  document: "Documento do cabeçalho",
};

export type TemplateDraft = {
  template: WhatsappTemplate | null;
  variables: Record<string, string>;
  headerFile: File | null;
};

export const emptyTemplateDraft: TemplateDraft = { template: null, variables: {}, headerFile: null };

/** O que falta para enviar, ou null quando o modelo está pronto. */
export const templateDraftError = (draft: TemplateDraft) => {
  if (!draft.template) return "Selecione um modelo";
  if (!draft.template.sendable) return draft.template.unavailableReason ?? "Este modelo não pode ser enviado";

  const missing = draft.template.parameters.filter((parameter) => !draft.variables[parameter.key]?.trim());
  if (missing.length) return `Preencha: ${missing.map((parameter) => parameter.label).join(", ")}`;

  const fileType = headerFileType(draft.template);
  if (fileType && !draft.headerFile) return `Escolha o arquivo: ${headerFileLabel[fileType].toLowerCase()}`;

  return null;
};

/** Sobe o arquivo do cabeçalho (quando há) e devolve o corpo do envio. */
export async function buildTemplateSendBody(
  clientId: string,
  configurationId: string,
  draft: TemplateDraft,
): Promise<SendTemplateRequestBody> {
  const template = draft.template!;
  const fileType = headerFileType(template);
  let headerFileId: string | undefined;

  if (fileType && draft.headerFile) {
    const file = draft.headerFile;
    const { fileId, url } = await whatsappService.getTemplateHeaderUploadUrl({
      params: { clientId, configurationId, fileType },
      body: { fileName: file.name, fileSize: file.size, mimeType: file.type },
    });

    await new BlockBlobClient(url).uploadData(file, { blobHTTPHeaders: { blobContentType: file.type }, blockSize: file.size });
    headerFileId = fileId;
  }

  const variables = Object.fromEntries(
    template.parameters.map((parameter) => [parameter.key, draft.variables[parameter.key]?.trim() ?? ""]),
  );

  return { templateId: template.id, variables: template.parameters.length ? variables : undefined, headerFileId };
}
