import { formatWhatsappText } from "@/utils/formatString";
import { Copy, ExternalLink, FileText, Image, LayoutTemplate, Phone, Reply, Video } from "lucide-react";
import type { FC } from "react";

const buttonIcons: Record<string, typeof Reply> = {
  URL: ExternalLink,
  PHONE_NUMBER: Phone,
  COPY_CODE: Copy,
};

const mediaLabels = { IMAGE: "Imagem", VIDEO: "Vídeo", DOCUMENT: "Documento" } as const;
const mediaIcons = { IMAGE: Image, VIDEO: Video, DOCUMENT: FileText } as const;

const TemplateMedia: FC<{ media: NonNullable<WhatsappTemplateMessageView["media"]> }> = ({ media }) => {
  const MediaIcon = mediaIcons[media.type];

  if (media.url && media.type === "IMAGE")
    return <img src={media.url} alt="Imagem do modelo" className="max-h-64 w-full rounded object-cover" />;
  if (media.url && media.type === "VIDEO") return <video src={media.url} controls className="max-h-64 w-full rounded" />;
  if (media.url && media.type === "DOCUMENT")
    return (
      <a
        href={media.url}
        target="_blank"
        rel="noreferrer"
        className="bg-background/60 text-primary flex items-center gap-2 rounded px-2 py-2 text-sm hover:underline"
      >
        <FileText className="size-5 shrink-0" />
        <span className="min-w-0 truncate">{media.filename || "Documento"}</span>
      </a>
    );

  // Envios antigos não guardaram o link do arquivo
  return (
    <div className="bg-background/60 text-muted-foreground flex items-center gap-2 rounded px-2 py-3 text-sm">
      <MediaIcon className="size-5 shrink-0" />
      {mediaLabels[media.type]}
    </div>
  );
};

/** Modelo como o contato vê no WhatsApp: arquivo, cabeçalho, texto, rodapé e botões. */
export const TemplateMessage: FC<{ template: WhatsappTemplateMessageView }> = ({ template }) => (
  <div className="flex flex-col gap-1.5">
    {template.name && (
      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium" title="Modelo de mensagem">
        <LayoutTemplate className="size-3 shrink-0" />
        <span className="truncate">Modelo: {template.name}</span>
      </p>
    )}

    {template.media && <TemplateMedia media={template.media} />}
    {template.header && <p className="font-semibold whitespace-pre-wrap">{template.header}</p>}
    {template.body && <p className="whitespace-pre-wrap">{formatWhatsappText(template.body)}</p>}
    {template.footer && <p className="text-muted-foreground text-xs">{template.footer}</p>}

    {template.buttons.length > 0 && (
      <div className="-mx-2 mt-1 flex flex-col border-t border-black/10 dark:border-white/10">
        {template.buttons.map((button, index) => {
          const ButtonIcon = buttonIcons[button.type] ?? Reply;

          return (
            <div
              key={index}
              className="text-primary flex items-center justify-center gap-1.5 border-b border-black/10 px-2 py-1.5 text-sm font-medium last:border-b-0 dark:border-white/10"
            >
              <ButtonIcon className="size-3.5 shrink-0" />
              <span className="truncate">{button.text}</span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
