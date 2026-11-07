import { Button } from "@/components/ui/button";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { MessageCircle } from "lucide-react";
import type { FC, MouseEvent } from "react";
import { Link } from "react-router";
import { contactChatPath, dealContactName } from "../crmUtils";
import { useChatDock } from "./chatDockContext";

type OpenChatButtonProps = {
  contact: DealContact;
  // "icon" é o atalho compacto do card e da lista
  variant?: "icon" | "button";
  onOpened?: () => void;
  className?: string;
};

/**
 * Abre a conversa do contato numa janela no rodapé do CRM. No celular, ou fora do CRM, leva para a tela de
 * atendimento.
 */
export const OpenChatButton: FC<OpenChatButtonProps> = ({ contact, variant = "button", onOpened, className }) => {
  const chatDock = useChatDock();
  const baseUrl = useBaseUrl();
  const label = `Abrir conversa com ${dealContactName(contact)}`;
  const isIcon = variant === "icon";

  const content = (
    <>
      <MessageCircle className="h-3.5 w-3.5" />
      {!isIcon && "Abrir conversa"}
    </>
  );

  const buttonProps = {
    variant: isIcon ? ("ghost" as const) : ("outline" as const),
    size: isIcon ? ("icon" as const) : ("sm" as const),
    className: cn(isIcon && "text-muted-foreground hover:text-primary h-6 w-6", className),
    title: label,
    "aria-label": label,
  };

  // O card e a linha da lista também abrem o negócio no clique
  const stopPropagation = (event: MouseEvent) => event.stopPropagation();

  if (!chatDock)
    return (
      <Button {...buttonProps} asChild>
        <Link to={contactChatPath(baseUrl, contact)} onClick={stopPropagation}>
          {content}
        </Link>
      </Button>
    );

  return (
    <Button
      {...buttonProps}
      type="button"
      onClick={(event) => {
        stopPropagation(event);
        chatDock.openChat(contact);
        onOpened?.();
      }}
    >
      {content}
    </Button>
  );
};
