import { Skeleton } from "@/components/ui/skeleton";
import { format, isSameYear, isToday, isYesterday } from "date-fns";
import { ArrowDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { MessageItem } from "./components/messageItem";
import { useContactMessages } from "./hooks/useContactMessages";
import { contactDisplayName } from "@/pages/dashboard/whatsapp/contactDisplayName";

type MessageListProps = {
  contact: WhatsappContactMessage;
  onReply?: (message: WhatsappMessage) => void;
};

const dayKey = (date: string) => format(date, "yyyy-MM-dd");

const dayLabel = (date: string) => {
  if (isToday(date)) return "Hoje";
  if (isYesterday(date)) return "Ontem";
  return format(date, isSameYear(date, new Date()) ? "d 'de' MMMM" : "d 'de' MMMM 'de' yyyy");
};

export const MessageList = ({ contact, onReply }: MessageListProps) => {
  const { scrollRef, onScrollChat, isFetching, messages, unseenCount, scrollToBottom } = useContactMessages({
    contact,
  });

  const contactName = contactDisplayName(contact, "Contato");

  return (
    <div className={"relative grid h-full grid-rows-[auto_min-content] overflow-hidden pt-4"}>
      <div ref={scrollRef} onScroll={onScrollChat} className="flex max-h-full flex-col-reverse gap-2 overflow-auto px-4">
        <AnimatePresence initial={false}>
          {/* Itens soltos (e não Fragment) para o AnimatePresence acompanhar cada mensagem pela chave */}
          {messages.flatMap((message, index) => {
            // Da mais nova para a mais antiga; a lista é invertida, então o separador vem depois da última mensagem do dia
            const older = messages[index + 1];
            const isFirstOfDay = !older || dayKey(older.createdAt) !== dayKey(message.createdAt);
            const item = <MessageItem message={message} key={message.id} contactId={contact.id} contactName={contactName} onReply={onReply} />;
            if (!isFirstOfDay) return [item];

            const label = dayLabel(message.createdAt);
            return [
              item,
              <div key={`day-${dayKey(message.createdAt)}`} className="flex shrink-0 justify-center py-1" role="separator" aria-label={label}>
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
