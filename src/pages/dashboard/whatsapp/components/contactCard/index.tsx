import { Badge } from "@/components/ui/badge";
import { type DetailedHTMLProps, type FC } from "react";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { cn } from "@/lib/utils";
import { differenceInHours, differenceInMinutes, format } from "date-fns";
import { AlertCircle, UserRound } from "lucide-react";
import { Message } from "./components/message";
import { ContactAvatar } from "@/components/contact-avatar";
import { formatConversationTime } from "@/utils/formatString";
import { contactDisplayName } from "../../contactDisplayName";
import { useNow } from "@/hooks/use-now";
import { useDraftPreview } from "../../conversationDrafts";
import { WhatsappServiceStatus } from "@/enums/whatsappServiceStatus.enum";

type ContactCardProps = DetailedHTMLProps<React.HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  contact: WhatsappContactMessage;
  active: boolean;
  /** Termo buscado, destacado no nome */
  highlight?: string;
  /** Mostra com quem a conversa está (aba Todos) */
  showRepresentative?: boolean;
};

/** Destaca, sem diferenciar maiúsculas, cada ocorrência do termo no texto. */
const HighlightedText: FC<{ text: string; term?: string }> = ({ text, term }) => {
  const query = term?.trim();
  if (!query) return <>{text}</>;

  const lowerText = text.toLocaleLowerCase();
  const lowerQuery = query.toLocaleLowerCase();
  const parts: { value: string; match: boolean }[] = [];
  let cursor = 0;
  let index = lowerText.indexOf(lowerQuery);
  while (index !== -1) {
    if (index > cursor) parts.push({ value: text.slice(cursor, index), match: false });
    parts.push({ value: text.slice(index, index + query.length), match: true });
    cursor = index + query.length;
    index = lowerText.indexOf(lowerQuery, cursor);
  }
  if (cursor < text.length) parts.push({ value: text.slice(cursor), match: false });

  return (
    <>
      {parts.map((part, i) =>
        part.match ? (
          <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40">
            {part.value}
          </mark>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </>
  );
};

/** Limites da espera na fila, em minutos: até o primeiro fica verde, até o segundo amarelo, depois vermelho. */
export const QUEUE_WAIT_WARNING_MINUTES = 5;
export const QUEUE_WAIT_CRITICAL_MINUTES = 15;

const formatWait = (minutes: number) => {
  if (minutes < 1) return "Chegou agora";
  if (minutes < 60) return `Esperando há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Esperando há ${hours} h ${String(minutes % 60).padStart(2, "0")}`;
  return `Esperando há ${Math.floor(hours / 24)} d`;
};

const waitColor = (minutes: number) => {
  if (minutes < QUEUE_WAIT_WARNING_MINUTES) return "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300";
  if (minutes < QUEUE_WAIT_CRITICAL_MINUTES) return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300";
};

/** Prazo da janela de 24h para responder sem template, recalculado a cada tique do relógio compartilhado. */
const getExpirationStatus = (replyTimeExpiredAt: string | null, now: number) => {
  if (!replyTimeExpiredAt) return null;

  const minutes = differenceInMinutes(new Date(replyTimeExpiredAt), now);
  if (minutes < 0) return null;

  const hours = differenceInHours(new Date(replyTimeExpiredAt), now);

  if (hours < 2) {
    return { color: "bg-red-100 text-red-800 border-red-300", icon: "text-red-600", label: `${minutes}min` };
  }

  if (hours < 6) {
    return { color: "bg-orange-100 text-orange-800 border-orange-300", icon: "text-orange-600", label: `${hours}h` };
  }

  return { color: "bg-green-100 text-green-800 border-green-300", icon: "text-green-600", label: `${hours}h` };
};

export const ContactCard: FC<ContactCardProps> = ({ contact, active, onClick, highlight, showRepresentative }) => {
  const now = useNow();
  // Na conversa aberta o rascunho já está na caixa de mensagem
  const draftPreview = useDraftPreview(contact.id);
  const showDraft = !!draftPreview && !active;
  const expirationStatus = getExpirationStatus(contact.replyTimeExpiredAt, now);

  const isWaiting = contact.serviceStatus === WhatsappServiceStatus.WAITING_ATTENDANT && !!contact.queueEnteredAt;
  const waitMinutes = isWaiting ? Math.max(0, differenceInMinutes(now, new Date(contact.queueEnteredAt as string))) : 0;
  const representative = showRepresentative ? contact.serviceRepresentative : null;

  const isIncoming = contact.messageType === WhatsappMessageType.INCOMING;

  const nameToPresentation = contactDisplayName(contact);
  const hasUnread = contact.unreadCount > 0;

  return (
    <button
      type="button"
      aria-current={active || undefined}
      onClick={onClick}
      className={`border-border w-full border-b px-4 py-3 text-left transition-colors ${
        active ? "border-l-2 border-l-green-500 bg-green-50" : "border-l-2 border-l-transparent hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <ContactAvatar contact={contact} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            <span className="text-foreground truncate text-sm font-semibold">
              <HighlightedText text={nameToPresentation} term={highlight} />
            </span>
            {contact.lastMessageAt && (
              <span className={cn("shrink-0 text-xs", hasUnread ? "font-semibold text-green-600" : "text-muted-foreground")}>
                {formatConversationTime(contact.lastMessageAt)}
              </span>
            )}
          </div>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              {showDraft ? (
                <p className="line-clamp-2 text-sm">
                  <span className="font-medium text-red-600 dark:text-red-400">Rascunho: </span>
                  <span className="text-muted-foreground">{draftPreview}</span>
                </p>
              ) : (
                <Message isIncoming={isIncoming} messageContentType={contact.messageContentType}>
                  {contact.messageContent}
                </Message>
              )}
            </div>
            {hasUnread && (
              <span
                aria-label={`${contact.unreadCount} mensagem(ns) não lida(s)`}
                className="mt-0.5 flex h-5 min-w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-500 px-1.5 text-[11px] font-bold text-white"
              >
                {contact.unreadCount > 99 ? "99+" : contact.unreadCount}
              </span>
            )}
          </div>
          {(isWaiting || representative) && (
            <div className="mt-1 mb-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
              {isWaiting && (
                <span
                  title={`Na fila desde ${format(new Date(contact.queueEnteredAt as string), "dd/MM HH:mm")}`}
                  className={cn("rounded px-1.5 py-0.5 text-[11px] leading-none font-medium tabular-nums", waitColor(waitMinutes))}
                >
                  {formatWait(waitMinutes)}
                </span>
              )}
              {representative && (
                <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-[11px]">
                  <UserRound className="h-3 w-3 shrink-0" />
                  <span className="truncate">com {representative}</span>
                </span>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {contact.categories &&
              contact.categories.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  className="text-muted-foreground bg-muted flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none font-medium"
                >
                  {t.name}
                </span>
              ))}
            {contact.categories && contact.categories.length > 2 && (
              <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold">
                +{contact.categories.length - 2}
              </span>
            )}
            {expirationStatus && (
              <Badge
                variant="outline"
                title="Tempo restante para responder sem template"
                className={cn("ml-auto flex items-center gap-1 text-xs", expirationStatus.color)}
              >
                <AlertCircle className={cn("h-3 w-3", expirationStatus.icon)} />
                {expirationStatus.label}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
