import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import type { FC } from "react";

type ConversationListProps = {
  conversations: AssistantConversation[];
  selectedId: string | null;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onSelect: (conversationId: string | null) => void;
  onDelete: (conversation: AssistantConversation) => void;
};

export const ConversationList: FC<ConversationListProps> = ({
  conversations,
  selectedId,
  isLoading,
  isError,
  onRetry,
  onSelect,
  onDelete,
}) => (
  <div className="grid gap-2">
    <Button size="sm" variant="outline" className="w-full" onClick={() => onSelect(null)}>
      <MessageSquarePlus className="h-4 w-4" />
      Nova conversa
    </Button>
    {isLoading && <LoadingState className="justify-start py-2" />}
    {isError && <ErrorState message="Não foi possível carregar as conversas." onRetry={onRetry} className="py-4" />}
    {!isLoading && !isError && conversations.length === 0 && (
      <p className="text-muted-foreground px-2 py-1 text-xs">Nenhuma conversa ainda.</p>
    )}
    <ul className="grid gap-1">
      {conversations.map((conversation) => (
        <li key={conversation.id} className="group flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            aria-current={conversation.id === selectedId ? "true" : undefined}
            className={cn(
              "min-w-0 flex-1 rounded px-2 py-1.5 text-left",
              conversation.id === selectedId ? "bg-muted font-medium" : "hover:bg-muted/60",
            )}
            title={conversation.title}
          >
            <span className="block truncate text-sm">{conversation.title}</span>
            <span className="text-muted-foreground block text-[11px] font-normal">
              {format(new Date(conversation.updatedAt), "dd/MM HH:mm")}
            </span>
          </button>
          <Button
            size="icon"
            variant="ghost"
            // Discreto no computador e sempre visível em telas de toque (sem hover)
            className="h-8 w-8 shrink-0 md:h-7 md:w-7 md:opacity-60 md:group-hover:opacity-100 md:focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            aria-label={`Apagar a conversa ${conversation.title}`}
            onClick={() => onDelete(conversation)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  </div>
);
