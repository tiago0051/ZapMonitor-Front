import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { cn } from "@/lib/utils";
import type { FC, ReactNode } from "react";

type MessageFileContent = { url: string; filename: string };

const contentTypeLabels: Record<string, string> = {
  [WhatsappMessageContentType.AUDIO]: "Mensagem de áudio",
  [WhatsappMessageContentType.IMAGE]: "Imagem",
  [WhatsappMessageContentType.DOCUMENT]: "Documento",
  [WhatsappMessageContentType.VIDEO]: "Vídeo",
  [WhatsappMessageContentType.STICKER]: "Figurinha",
  [WhatsappMessageContentType.CONTACTS]: "Contato",
};

type MessageReplyPreviewProps = {
  replyTo: WhatsappMessageReplyTo;
  contactName: string;
  className?: string;
  children?: ReactNode;
};

export const MessageReplyPreview: FC<MessageReplyPreviewProps> = ({ replyTo, contactName, className, children }) => {
  const authorName = replyTo.type === WhatsappMessageType.OUTGOING ? "Você" : contactName;

  const isText = replyTo.contentType === WhatsappMessageContentType.TEXT || replyTo.contentType === WhatsappMessageContentType.TEMPLATE;
  const hasThumbnail =
    replyTo.contentType === WhatsappMessageContentType.IMAGE || replyTo.contentType === WhatsappMessageContentType.STICKER;
  const fileContent = replyTo.content as MessageFileContent | null;

  let description = contentTypeLabels[replyTo.contentType] ?? "Mensagem";
  if (isText && typeof replyTo.content === "string") description = replyTo.content;
  if (replyTo.contentType === WhatsappMessageContentType.DOCUMENT && fileContent?.filename) description = fileContent.filename;

  return (
    <div className={cn("bg-background/60 border-primary flex items-center gap-2 rounded border-l-4 px-2 py-1 text-xs", className)}>
      <div className="min-w-0 flex-1">
        <p className="text-primary truncate font-medium">{authorName}</p>
        <p className="text-muted-foreground line-clamp-2 break-words whitespace-pre-wrap">{description}</p>
      </div>
      {hasThumbnail && fileContent?.url && (
        <img src={fileContent.url} alt={description} className="size-10 shrink-0 rounded object-cover" />
      )}
      {children}
    </div>
  );
};
