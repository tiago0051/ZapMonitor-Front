import { EmptyState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bot, Loader2, MessageSquarePlus, SendHorizontal, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FC, type FormEvent } from "react";
import { AdSuggestionCard } from "./components/adSuggestionCard";
import { AdvisorText } from "./components/advisorText";

const STARTERS = [
  "Quais campanhas trazem conversa mas não vendem?",
  "Como redistribuir a verba entre as campanhas para vender mais?",
  "Quais criativos estão cansados e o que testar no lugar?",
];

/** Conversa com a IA sobre a estratégia da conta; o que ela propõe vira sugestão. */
export const AdsStrategyChat: FC<{ account: AdAccount; aiEnabled: boolean }> = ({ account, aiEnabled }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // Pergunta mostrada enquanto a IA responde
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const chatsQuery = useQuery({
    queryKey: ["metaAds", "chats", client.id, account.id],
    queryFn: () => metaAdsService.findChats({ params: { clientId: client.id, accountId: account.id } }),
  });
  const conversationQuery = useQuery({
    queryKey: ["metaAds", "chat", client.id, chatId],
    queryFn: () => metaAdsService.findChatConversation({ params: { clientId: client.id, chatId: chatId! } }),
    enabled: !!chatId,
  });

  const send = useMutation({
    mutationFn: metaAdsService.sendChatMessage,
    onError: (error) => {
      setMessage(pendingMessage ?? "");
      setPendingMessage(null);
      requestErrorHandling(error);
    },
    onSuccess: (result) => {
      setPendingMessage(null);
      setChatId(result.chat.id);
      queryClient.invalidateQueries({ queryKey: ["metaAds", "chats"] });
      queryClient.invalidateQueries({ queryKey: ["metaAds", "chat", client.id, result.chat.id] });
      if (result.suggestions.length) queryClient.invalidateQueries({ queryKey: ["metaAds", "suggestions"] });
    },
  });
  const deleteChat = useMutation({
    mutationFn: metaAdsService.deleteChat,
    onError: requestErrorHandling,
    onSuccess: () => {
      setChatId(null);
      queryClient.invalidateQueries({ queryKey: ["metaAds", "chats"] });
    },
  });

  const conversation = chatId ? conversationQuery.data : undefined;
  const suggestionsById = new Map(conversation?.suggestions.map((suggestion) => [suggestion.id, suggestion]));

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [conversation?.messages.length, pendingMessage]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;

    setPendingMessage(trimmed);
    setMessage("");
    send.mutate({ params: { clientId: client.id, accountId: account.id }, body: { message: trimmed, chatId } });
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(message);
  };

  return (
    <div className="grid min-h-[480px] gap-4 md:grid-cols-[220px_1fr]">
      <aside className="space-y-2">
        <Button size="sm" variant="outline" className="w-full" onClick={() => setChatId(null)}>
          <MessageSquarePlus className="h-4 w-4" />
          Nova conversa
        </Button>
        {chatsQuery.isLoading && <LoadingState className="justify-start py-2" />}
        <ul className="space-y-1">
          {chatsQuery.data?.map((chat) => (
            <li key={chat.id} className="group flex items-center gap-1">
              <button
                type="button"
                onClick={() => setChatId(chat.id)}
                className={cn(
                  "min-w-0 flex-1 truncate rounded px-2 py-1.5 text-left text-sm",
                  chat.id === chatId ? "bg-muted font-medium" : "hover:bg-muted/60",
                )}
                title={chat.title}
              >
                {chat.title}
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label={`Apagar a conversa ${chat.title}`}
                disabled={deleteChat.isPending}
                onClick={() => deleteChat.mutate({ params: { clientId: client.id, chatId: chat.id } })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-h-0 flex-col rounded-lg border">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {!chatId && !pendingMessage && (
            <EmptyState
              icon={Bot}
              title="Converse sobre a estratégia desta conta"
              description="A IA lê as campanhas, as métricas de 30 dias e as vendas do CRM. Mudanças concretas que ela propor viram sugestões."
            />
          )}
          {!chatId && !pendingMessage && aiEnabled && (
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((starter) => (
                <Button
                  key={starter}
                  size="sm"
                  variant="outline"
                  className="h-auto py-1.5 text-xs whitespace-normal"
                  onClick={() => submit(starter)}
                >
                  {starter}
                </Button>
              ))}
            </div>
          )}
          {chatId && conversationQuery.isLoading && <LoadingState />}

          {conversation?.messages.map((item) =>
            item.role === "USER" ? (
              <div
                key={item.id}
                className="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
              >
                {item.content}
              </div>
            ) : (
              <div key={item.id} className="max-w-[95%] space-y-2">
                <div className="bg-muted/50 rounded-lg px-3 py-2">
                  <AdvisorText text={item.content} />
                </div>
                {item.suggestionIds.map((suggestionId) => {
                  const suggestion = suggestionsById.get(suggestionId);
                  return suggestion ? (
                    <AdSuggestionCard key={suggestionId} suggestion={suggestion} currency={account.currency} compact />
                  ) : null;
                })}
                <p className="text-muted-foreground text-[11px]">{format(new Date(item.createdAt), "dd/MM HH:mm")}</p>
              </div>
            ),
          )}

          {pendingMessage && (
            <>
              <div className="bg-primary text-primary-foreground ml-auto max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap">
                {pendingMessage}
              </div>
              <p className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Analisando a conta…
              </p>
            </>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t p-2">
          <textarea
            aria-label="Mensagem para a IA"
            value={message}
            maxLength={4000}
            rows={2}
            disabled={!aiEnabled}
            placeholder={aiEnabled ? "Pergunte sobre as campanhas, a verba, os criativos…" : "A inteligência artificial não está ativa"}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submit(message);
              }
            }}
            className="border-input bg-background focus-visible:ring-ring min-h-10 flex-1 resize-none rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
          />
          <Button type="submit" size="icon" aria-label="Enviar" disabled={!aiEnabled || !message.trim() || send.isPending}>
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
