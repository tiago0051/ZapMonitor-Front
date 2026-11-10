import { ContactAvatar } from "@/components/contact-avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { useChatSubscription } from "@/pages/dashboard/whatsapp/components/chatView/hooks/useChatSubscription";
import { ChatComposer } from "@/pages/dashboard/whatsapp/components/chatView/components/chatComposer";
import { canReplyToContact } from "@/pages/dashboard/whatsapp/components/chatView/components/chatComposer/canReplyToContact";
import { MessageList } from "@/pages/dashboard/whatsapp/components/chatView/components/messageList";
import { useContactService } from "@/pages/dashboard/whatsapp/components/chatView/hooks/useContactService";
import { useServiceActions } from "@/pages/dashboard/whatsapp/components/chatView/hooks/useServiceActions";
import { formatPhoneNumber } from "@/utils/formatString";
import { ExternalLink, Minus, X } from "lucide-react";
import { useEffect, useState, type FC, type ReactNode } from "react";
import { Link } from "react-router";
import { contactChatPath, dealContactName } from "../crmUtils";
import { useDockContact } from "./useDockContact";

export const CHAT_WINDOW_WIDTH = 328;
export const CHAT_WINDOW_MINIMIZED_WIDTH = 240;

type ChatWindowProps = {
  contact: DealContact;
  minimized: boolean;
  onToggleMinimized: () => void;
  onClose: () => void;
};

/** Janela de conversa no rodapé do CRM: só a conversa e o envio de mensagens. */
export const ChatWindow: FC<ChatWindowProps> = ({ contact, minimized, onToggleMinimized, onClose }) => {
  const baseUrl = useBaseUrl();
  const { socket, isConnected } = useSocketContext();
  const { chatContact, isLoading, isError } = useDockContact(contact);
  const [unreadCount, setUnreadCount] = useState(0);
  const [prevMinimized, setPrevMinimized] = useState(minimized);

  if (minimized !== prevMinimized) {
    setPrevMinimized(minimized);
    if (!minimized) setUnreadCount(0);
  }

  // Mensagens que chegam com a janela minimizada aparecem como contador no cabeçalho
  useEffect(() => {
    if (!minimized) return;

    const handleNewMessage = (message: WhatsappMessage) => {
      if (message.type === WhatsappMessageType.INCOMING) setUnreadCount((count) => count + 1);
    };

    socket.on(`contact:${contact.id}:messages:update`, handleNewMessage);

    return () => {
      socket.off(`contact:${contact.id}:messages:update`, handleNewMessage);
    };
  }, [minimized, contact.id, isConnected, socket]);

  const contactName = dealContactName(contact);

  let body: ReactNode;
  if (isLoading) body = <ChatWindowSkeleton />;
  else if (chatContact) body = <ChatWindowConversation contact={chatContact} />;
  else
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground text-sm">
          {isError
            ? "Não foi possível carregar esta conversa."
            : "Este contato ainda não tem conversa no WhatsApp ou está fora dos seus grupos de atendimento."}
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={contactChatPath(baseUrl, contact)}>Abrir no atendimento</Link>
        </Button>
      </div>
    );

  return (
    <section
      aria-label={`Conversa com ${contactName}`}
      className={cn(
        "bg-card pointer-events-auto flex shrink-0 flex-col overflow-hidden rounded-t-lg border border-b-0 shadow-xl",
        !minimized && "h-[460px] max-h-[calc(100dvh-7rem)]",
      )}
      style={{ width: minimized ? CHAT_WINDOW_MINIMIZED_WIDTH : CHAT_WINDOW_WIDTH }}
    >
      <header
        className={cn("flex shrink-0 cursor-pointer items-center gap-2 px-2 py-1.5", !minimized && "border-b")}
        onClick={onToggleMinimized}
      >
        <ContactAvatar contact={contact} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{contactName}</p>
          {!minimized && (
            <p className="text-muted-foreground truncate text-[11px]">
              {formatPhoneNumber(contact.phoneNumber)}
              {chatContact?.serviceRepresentative && ` · com ${chatContact.serviceRepresentative}`}
            </p>
          )}
        </div>
        {minimized && unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[11px] font-semibold tabular-nums">
            {unreadCount}
          </span>
        )}
        <div className="flex shrink-0 items-center" onClick={(event) => event.stopPropagation()}>
          {!minimized && (
            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
              <Link to={contactChatPath(baseUrl, contact)} title="Abrir no atendimento" aria-label="Abrir no atendimento">
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onToggleMinimized}
            title={minimized ? "Abrir" : "Minimizar"}
            aria-label={minimized ? "Abrir conversa" : "Minimizar conversa"}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Fechar" aria-label="Fechar conversa">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Minimizada, a conversa continua montada para seguir inscrita e não perder as mensagens novas */}
      <div className={cn("flex min-h-0 flex-1 flex-col", minimized && "hidden")}>{body}</div>
    </section>
  );
};

const ChatWindowConversation: FC<{ contact: WhatsappContactMessage }> = ({ contact }) => {
  const { contactService } = useContactService({ contactId: contact.id });
  const serviceActions = useServiceActions({ contact, contactService });
  const [replyingTo, setReplyingTo] = useState<WhatsappMessage | null>(null);

  useChatSubscription(contact.id);

  const { canSendMessage } = canReplyToContact(contact, contactService);

  return (
    <>
      <MessageList contact={contact} onReply={canSendMessage ? setReplyingTo : undefined} />
      <ChatComposer
        contact={contact}
        contactService={contactService}
        serviceActions={serviceActions}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        className="px-2 pb-2"
      />
    </>
  );
};

const ChatWindowSkeleton = () => (
  <div className="flex flex-1 flex-col justify-end gap-2 p-3">
    <Skeleton className="h-8 w-3/4" />
    <Skeleton className="h-8 w-2/3 self-end" />
    <Skeleton className="h-8 w-1/2" />
  </div>
);
