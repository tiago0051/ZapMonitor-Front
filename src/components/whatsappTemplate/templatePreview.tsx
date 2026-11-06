import { cn } from "@/lib/utils";
import { formatWhatsappText } from "@/utils/formatString";
import { ExternalLink, FileText, Image, Phone, Reply, Video, Copy } from "lucide-react";
import type { FC } from "react";
import { fillTemplateText } from "./templateUtils";

type TemplatePreviewProps = {
  template: WhatsappTemplate;
  variables?: Record<string, string>;
  headerFileName?: string | null;
  className?: string;
};

const mediaIcon = { IMAGE: Image, VIDEO: Video, DOCUMENT: FileText } as const;

const buttonIcon = (type: string) => {
  switch (type) {
    case "URL":
      return ExternalLink;
    case "PHONE_NUMBER":
      return Phone;
    case "COPY_CODE":
      return Copy;
    default:
      return Reply;
  }
};

/** Bolha do WhatsApp com o modelo preenchido pelo que foi digitado ou pelos exemplos da Meta. */
export const TemplatePreview: FC<TemplatePreviewProps> = ({ template, variables, headerFileName, className }) => {
  if (!template.synced) {
    return (
      <p className={cn("text-muted-foreground rounded-lg border border-dashed p-3 text-xs", className)}>
        Cadastro manual: o texto só aparece depois de sincronizar os modelos com a Meta.
      </p>
    );
  }

  const MediaIcon =
    template.headerFormat && template.headerFormat in mediaIcon ? mediaIcon[template.headerFormat as keyof typeof mediaIcon] : null;
  const headerText = template.headerFormat === "TEXT" ? fillTemplateText(template.headerText, "header", template, variables) : null;
  const bodyText = fillTemplateText(template.bodyText, "body", template, variables);

  return (
    <div className={cn("rounded-lg bg-[#efeae2] p-3 dark:bg-[#0b141a]", className)}>
      <div className="max-w-[320px] overflow-hidden rounded-lg rounded-tl-none bg-white text-sm text-[#111b21] shadow-sm dark:bg-[#202c33] dark:text-[#e9edef]">
        <div className="space-y-1.5 p-2.5">
          {MediaIcon && (
            <div className="flex h-24 flex-col items-center justify-center gap-1 rounded-md bg-black/5 text-xs text-black/50 dark:bg-white/5 dark:text-white/50">
              <MediaIcon className="h-6 w-6" />
              <span className="max-w-full truncate px-2">{headerFileName || "Arquivo escolhido no envio"}</span>
            </div>
          )}
          {headerText && <p className="font-semibold break-words">{headerText}</p>}
          {bodyText && <p className="break-words whitespace-pre-wrap">{formatWhatsappText(bodyText)}</p>}
          {template.footerText && <p className="text-xs text-black/45 dark:text-white/45">{template.footerText}</p>}
        </div>
        {template.buttons.length > 0 && (
          <div className="divide-y divide-black/10 border-t border-black/10 dark:divide-white/10 dark:border-white/10">
            {template.buttons.map((button, index) => {
              const Icon = buttonIcon(button.type);
              return (
                <div
                  key={index}
                  className="flex items-center justify-center gap-1.5 py-2 text-[13px] font-medium text-[#027eb5] dark:text-[#53bdeb]"
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{button.text ?? "Botão"}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
