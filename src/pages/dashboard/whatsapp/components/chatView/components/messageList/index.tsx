import { Skeleton } from "@/components/ui/skeleton";
import { format, isSameYear, isToday, isYesterday } from "date-fns";
import { ArrowDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useContactNotes } from "@/pages/dashboard/whatsapp/notes/useContactNotes";
import { NoteItem } from "@/pages/dashboard/whatsapp/notes/noteItem";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";
import { MessageItem } from "./components/messageItem";
import { useContactMessages } from "./hooks/useContactMessages";
import { contactDisplayName } from "@/pages/dashboard/whatsapp/contactDisplayName";

export type ConversationSearchState = { term: string; messageId: string | null; nonce: number };

type MessageListProps = {
  contact: WhatsappContactMessage;
  onReply?: (message: WhatsappMessage) => void;
  search?: ConversationSearchState | null;
};

const dayKey = (date: string) => format(date, "yyyy-MM-dd");

const dayLabel = (date: string) => {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, isSameYear(date, new Date()) ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy");
};

export const MessageList = ({ contact, onReply, search }: MessageListProps) => {
  const { scrollRef, onScrollChat, isFetching, messages, unseenCount, scrollToBottom, loadUntilMessage, hasOlderMessages } =
    useContactMessages({ contact });
  const notes = useContactNotes(contact.id);

  // Notas entram na ordem do tempo, só dentro do trecho já carregado (as mais antigas aparecem ao rolar para cima)
  const items = useMemo(() => {
    const oldestLoaded = messages.length ? messages[messages.length - 1].createdAt : null;
    const visibleNotes = notes.filter((note) => !hasOlderMessages || (oldestLoaded !== null && note.createdAt >= oldestLoaded));
    const merged: ({ kind: "message"; message: WhatsappMessage } | { kind: "note"; note: WhatsappInternalNote })[] = [
      ...messages.map((message) => ({ kind: "message" as const, message })),
      ...visibleNotes.map((note) => ({ kind: "note" as const, note })),
    ];
    // Da mais nova para a mais antiga, como a lista de mensagens
    return merged
      .map((item) => ({ ...item, createdAt: item.kind === "message" ? item.message.createdAt : item.note.createdAt }))
      .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime());
  }, [messages, notes, hasOlderMessages]);
  // Resultado escolhido na busca: carrega as páginas antigas até ele e rola até a mensagem
  const focusedId = search?.messageId ?? null;
  const focusNonce = search?.nonce ?? 0;
  const focusKey = focusedId ? `${focusedId}:${focusNonce}` : null;
  const [settledFocusKey, setSettledFocusKey] = useState<string | null>(null);
  const isJumping = !!focusKey && settledFocusKey !== focusKey;
  useEffect(() => {
    if (!focusedId) return;
    let cancelled = false;
    loadUntilMessage(focusedId).then((found) => {
      if (cancelled) return;
      setSettledFocusKey(`${focusedId}:${focusNonce}`);
      if (!found) {
        toast.info("Não foi possível mostrar esta mensagem na conversa");
        return;
      }
      // Espera a página nova aparecer na tela
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          const element = scrollRef.current?.querySelector(`[data-message-id="${focusedId}"]`);
          element?.scrollIntoView({ block: "center", behavior: "smooth" });
        }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [focusedId, focusNonce, loadUntilMessage, scrollRef]);

  const contactName = contactDisplayName(contact, "Contato");

  return (
    <div className={"relative grid h-full grid-rows-[auto_min-content] overflow-hidden pt-4"}>
      <div ref={scrollRef} onScroll={onScrollChat} className="flex max-h-full flex-col-reverse gap-2 overflow-auto px-4">
        <AnimatePresence initial={false}>
          {/* Itens soltos (e não Fragment) para o AnimatePresence acompanhar cada mensagem pela chave */}
          {items.flatMap((entry, index) => {
            // Da mais nova para a mais antiga; a lista é invertida, então o separador vem depois da última mensagem do dia
            const older = items[index + 1];
            const isFirstOfDay = !older || dayKey(older.createdAt) !== dayKey(entry.createdAt);
            const item =
              entry.kind === "note" ? (
                <NoteItem key={`note-${entry.note.id}`} note={entry.note} />
              ) : (
                <MessageItem
                  message={entry.message}
                  key={entry.message.id}
                  contactId={contact.id}
                  contactName={contactName}
                  onReply={onReply}
                  highlightTerm={search?.term || undefined}
                  isFocused={entry.message.id === focusedId}
                />
              );
            if (!isFirstOfDay) return [item];

            const label = dayLabel(entry.createdAt);
            return [
              item,
              <div key={`day-${dayKey(entry.createdAt)}`} className="flex shrink-0 justify-center py-1" role="separator" aria-label={label}>
                <span className="bg-muted text-muted-foreground rounded-full px-3 py-0.5 text-xs font-medium first-letter:uppercase">
                  {label}
                </span>
              </div>,
            ];
          })}
        </AnimatePresence>

        {isFetching &&
          new Array(3).fill({}).map((_v, index) => (
            <div key={index} data-my={index % 2 === 0} className="bg-secondary w-5/6 shrink-0 rounded-sm p-2 data-[my=true]:self-end">
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
      </div>

      {isJumping && (
        <div
          role="status"
          className="bg-background/95 absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1 text-xs shadow-sm"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando mensagens antigas...
        </div>
      )}

      {unseenCount > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="bg-primary text-primary-foreground absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold shadow-md"
        >
          <ArrowDown className="h-3.5 w-3.5" />
          {unseenCount === 1 ? "1 nova" : `${unseenCount} novas`}
        </button>
      )}
    </div>
  );
};
