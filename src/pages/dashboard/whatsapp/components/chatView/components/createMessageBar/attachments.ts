import { whatsappContants } from "@/contants/whatsappContants";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";

// Limites da API oficial da Meta; o QR code aceita o mesmo sem problema
const VIDEO_TYPES = ["video/mp4", "video/3gpp"];
const VIDEO_MAX_BYTES = 16 * 1024 * 1024;
// Vários arquivos de uma vez são enviados um a um; acima disso fica lento e confuso
export const MAX_ATTACHMENTS = 10;

const documentTypes = (whatsappContants.DOCUMENT_TYPES ?? "").split(",").filter(Boolean);

export const ATTACHMENT_ACCEPT = {
  media: "image/*,video/mp4,video/3gpp",
  document: whatsappContants.DOCUMENT_TYPES as string,
};

export type AttachmentKind = WhatsappMessageContentType.IMAGE | WhatsappMessageContentType.VIDEO | WhatsappMessageContentType.DOCUMENT;

/** Como o arquivo vai para o WhatsApp; imagens viram JPEG antes do envio, então qualquer formato que o navegador abre serve. */
export function attachmentKind(file: File): AttachmentKind | null {
  if (file.type.startsWith("image/")) return WhatsappMessageContentType.IMAGE;
  if (VIDEO_TYPES.includes(file.type)) return WhatsappMessageContentType.VIDEO;
  if (documentTypes.includes(file.type)) return WhatsappMessageContentType.DOCUMENT;
  return null;
}

/** Motivo para recusar o arquivo antes de enviar; nulo quando pode ir. */
export function attachmentProblem(file: File): string | null {
  if (file.type.startsWith("video/") && !VIDEO_TYPES.includes(file.type)) return `${file.name}: envie vídeos em MP4`;
  const kind = attachmentKind(file);
  if (!kind) return `${file.name}: este tipo de arquivo não pode ser enviado pelo WhatsApp`;
  if (kind === WhatsappMessageContentType.VIDEO && file.size > VIDEO_MAX_BYTES) return `${file.name}: o vídeo pode ter até 16 MB`;
  return null;
}

export const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};

/** Tipo do arquivo para mostrar ao atendente: extensão do nome ou, sem ela, o subtipo do MIME. */
export const fileTypeLabel = (file: File) => {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  return (extension || file.type.split("/").pop() || "arquivo").toUpperCase();
};

/** Print colado vem como "image.png" para todos; um nome com a hora evita arquivos iguais na conversa. */
export function nameClipboardFile(file: File): File {
  if (file.name && file.name !== "image.png") return file;
  const extension = file.type.split("/").pop() || "png";
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
  return new File([file], `print-${stamp}.${extension}`, { type: file.type });
}
