import { cn } from "@/lib/utils";
import { MessageSquare, StickyNote } from "lucide-react";
import { useState, type FC, type MutableRefObject, type ReactNode } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";
import { CreateMessageBar } from "../createMessageBar";
import { DialogSendTemplate } from "../dialogSendTemplate";
import { ReplyBlockedNotice } from "../replyBlockedNotice";
import { canReplyToContact } from "./canReplyToContact";
import { NoteComposer } from "@/pages/dashboard/whatsapp/notes/noteComposer";

type ChatComposerProps = {
  contact: WhatsappContactMessage;
  contactService?: WhatsappContactService;
  serviceActions: ServiceActions;
  replyingTo: WhatsappMessage | null;
  onCancelReply: () => void;
  className?: string;
  // Arquivos soltos na conversa (arrastar e soltar) vão para a caixa de mensagem por aqui
  addFilesRef?: MutableRefObject<((files: File[]) => void) | null>;
};

type ComposerMode = "reply" | "note";

/**
 * Parte de baixo da conversa: a caixa de mensagem, o envio de template quando o prazo de 24h acabou ou o aviso para
 * assumir o atendimento. A aba "Nota interna" fica sempre disponível, mesmo sem poder responder.
 */
export const ChatComposer: FC<ChatComposerProps> = ({
  contact,
  contactService,
  serviceActions,
  replyingTo,
  onCancelReply,
  className,
  addFilesRef,
}) => {
  const [mode, setMode] = useState<ComposerMode>("reply");
  const { isReplyTimeExpired, canSendMessage } = canReplyToContact(contact, contactService);

  let replyContent: ReactNode = null;
  if (canSendMessage)
    replyContent = (
      <CreateMessageBar
        contact={contact}
        replyingTo={replyingTo}
        onCancelReply={onCancelReply}
        addFilesRef={mode === "reply" ? addFilesRef : undefined}
      />
    );
  // Recém-encerrado: o aviso leva à próxima conversa, mesmo com o prazo de 24h vencido
  else if (contactService && serviceActions.hasJustEnded)
    replyContent = <ReplyBlockedNotice contact={contact} contactService={contactService} serviceActions={serviceActions} />;
  else if (contactService && isReplyTimeExpired)
    replyContent = (
      <div className="flex flex-col gap-2">
        <p className="text-muted-foreground text-center text-sm">
          O prazo para responder livremente este contato acabou. Envie um template para retomar a conversa.
        </p>
        <DialogSendTemplate contactService={contactService} whatsappConfigurationId={contact.whatsappConfigurationId} />
      </div>
    );
  else if (contactService)
    replyContent = <ReplyBlockedNotice contact={contact} contactService={contactService} serviceActions={serviceActions} />;

  const tabClass = (active: boolean, note: boolean) =>
    cn(
      "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
      active
        ? note
          ? "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200"
          : "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-muted",
    );

  return (
    <div className={cn("flex flex-col gap-1.5 pt-2", className ?? "px-4 pb-3")}>
      <div role="tablist" aria-label="Tipo de mensagem" className="flex gap-1">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "reply"}
          onClick={() => setMode("reply")}
          className={tabClass(mode === "reply", false)}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Responder
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "note"}
          onClick={() => setMode("note")}
          className={tabClass(mode === "note", true)}
        >
          <StickyNote className="h-3.5 w-3.5" />
          Nota interna
        </button>
      </div>
      {mode === "note" ? <NoteComposer contactId={contact.id} /> : replyContent}
    </div>
  );
};
