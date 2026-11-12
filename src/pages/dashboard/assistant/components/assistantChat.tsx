import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { undoableAction } from "@/lib/undoToast";
import { cn } from "@/lib/utils";
import { assistantService } from "@/services/api/assistantService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, History, Loader2, SendHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from "react";
import { assistantKeys } from "../assistantUtils";
import { useAssistantTools } from "../useAssistantTools";
import { ChatMessageItem, UserBubble } from "./chatMessageItem";
import { ConversationList } from "./conversationList";
import { ToolCatalogPopover } from "./toolCatalogPopover";

const DEFAULT_STARTERS = [
  "Crie um fluxo de boas-vindas com um agente de IA que tira dúvidas e passa para o comercial",
  "Revise meu funil e proponha melhorias",
  "Monte uma campanha de disparo para quem não respondeu há 30 dias",
];

export type AssistantChatProps = {
  /** undefined abre a conversa mais recente; null começa uma nova */
  conversationId: string | null | undefined;
  onConversationChange: (conversationId: string | null) => void;
  /** Conta de anúncio em foco: só lista as conversas dela e manda junto em cada mensagem */
  adAccountId?: string;
  /** Tela aberta, para o assistente saber o contexto */
  page?: string;
  /** "page" mostra a lista de conversas ao lado no computador; "panel" sempre num painel à parte */
  variant?: "page" | "panel";
  highlightedPlanId?: string | null;
  starters?: string[];
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export const AssistantChat: FC<AssistantChatProps> = ({
  conversationId: requestedId,
  onConversationChange,
  adAccountId,
  page,
  variant = "page",
  highlightedPlanId,
  starters = DEFAULT_STARTERS,
  emptyTitle = "Peça o que precisar",
  emptyDescription = "O assistente consulta o sistema com as suas permissões. Quando propõe mudanças, monta um plano que só roda depois de aprovado.",
  className,
}) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  // Pergunta mostrada enquanto o assistente responde
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  // Conversas escondidas enquanto o "Desfazer" está na tela
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversationsQuery = useQuery({
    queryKey: assistantKeys.conversations(client.id),
    queryFn: () => assistantService.findConversations(client.id),
  });
  const conversations = useMemo(
    () =>
      (conversationsQuery.data ?? [])
        .filter((conversation) => !hiddenIds.includes(conversation.id))
        .filter((conversation) => !adAccountId || conversation.adAccountId === adAccountId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [conversationsQuery.data, hiddenIds, adAccountId],
  );

  // Sem escolha ainda: abre a mais recente assim que a lista chega
  const conversationId = requestedId === undefined ? (conversations[0]?.id ?? null) : requestedId;
  const waitingForLatest = requestedId === undefined && conversationsQuery.isLoading;

  const conversationQuery = useQuery({
    queryKey: assistantKeys.conversation(client.id, conversationId ?? ""),
    queryFn: () => assistantService.findConversation(client.id, conversationId!),
    enabled: !!conversationId,
  });
  const detail = conversationId ? conversationQuery.data : undefined;
  const plansById = useMemo(() => new Map(detail?.plans.map((plan) => [plan.id, plan])), [detail?.plans]);

  const toolsQuery = useAssistantTools();
  const toolDescriptions = useMemo(() => new Map(toolsQuery.data?.map((tool) => [tool.name, tool.description])), [toolsQuery.data]);

  const send = useMutation({
    mutationFn: (text: string) =>
      assistantService.sendMessage(client.id, {
        conversationId: conversationId ?? undefined,
        message: text,
        page,
        adAccountId,
      }),
    onError: (error, text) => {
      setMessage(text);
      setPendingMessage(null);
      requestErrorHandling(error);
    },
    onSuccess: (result, text) => {
      const key = assistantKeys.conversation(client.id, result.conversationId);
      const now = new Date().toISOString();
      // Mostra a resposta na hora, sem esperar a conversa recarregar
      queryClient.setQueryData<AssistantConversationDetail>(key, (current) => ({
        conversation: current?.conversation ?? {
          id: result.conversationId,
          title: text.slice(0, 80),
          adAccountId: adAccountId ?? null,
          createdAt: now,
          updatedAt: now,
        },
        messages: [...(current?.messages ?? []), ...result.messages],
        plans: result.plan
          ? [...(current?.plans ?? []).filter((plan) => plan.id !== result.plan!.id), result.plan]
          : (current?.plans ?? []),
      }));
      if (result.plan) {
        queryClient.setQueryData(assistantKeys.plan(client.id, result.plan.id), result.plan);
        queryClient.invalidateQueries({ queryKey: assistantKeys.awaitingMe(client.id) });
      }
      setPendingMessage(null);
      onConversationChange(result.conversationId);
      queryClient.invalidateQueries({ queryKey: assistantKeys.conversations(client.id) });
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: (id: string) => assistantService.deleteConversation(client.id, id),
    onError: (error, id) => {
      setHiddenIds((ids) => ids.filter((hidden) => hidden !== id));
      requestErrorHandling(error);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assistantKeys.conversations(client.id) }),
  });

  const removeConversation = (conversation: AssistantConversation) => {
    setHiddenIds((ids) => [...ids, conversation.id]);
    if (conversation.id === conversationId) onConversationChange(null);
    undoableAction({
      message: "Conversa apagada",
      commit: () => deleteConversation.mutate(conversation.id),
      onUndo: () => setHiddenIds((ids) => ids.filter((id) => id !== conversation.id)),
    });
  };

  const selectConversation = (id: string | null) => {
    setListOpen(false);
    if (send.isPending) return;
    onConversationChange(id);
    if (id === null) textareaRef.current?.focus();
  };

  const messageCount = detail?.messages.length ?? 0;
  const loadedConversationId = detail?.conversation.id;
  const scrolledPlanRef = useRef<string | null>(null);
  useEffect(() => {
    // Ao abrir um plano pelo link, rola até ele uma vez; depois segue a última mensagem
    if (highlightedPlanId && scrolledPlanRef.current !== highlightedPlanId) {
      const target = document.getElementById(`assistant-plan-${highlightedPlanId}`);
      if (target) {
        scrolledPlanRef.current = highlightedPlanId;
        target.scrollIntoView({ block: "center" });
        return;
      }
    }
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messageCount, loadedConversationId, pendingMessage, highlightedPlanId]);

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || send.isPending) return;
    setPendingMessage(trimmed);
    setMessage("");
    send.mutate(trimmed);
  };
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit(message);
  };

  const showEmpty = !conversationId && !pendingMessage && !waitingForLatest;
  const currentTitle = conversationId
    ? (conversations.find((item) => item.id === conversationId)?.title ?? detail?.conversation.title)
    : null;

  const list = (
    <ConversationList
      conversations={conversations}
      selectedId={conversationId}
      isLoading={conversationsQuery.isLoading}
      isError={conversationsQuery.isError}
      onRetry={() => conversationsQuery.refetch()}
      onSelect={selectConversation}
      onDelete={removeConversation}
    />
  );

  return (
    <div
      className={cn(
        "grid h-full min-h-0 grid-rows-[minmax(0,1fr)] gap-4",
        variant === "page" && "md:grid-cols-[240px_minmax(0,1fr)]",
        className,
      )}
    >
      {variant === "page" && <aside className="hidden min-h-0 overflow-y-auto md:block">{list}</aside>}

      <div className="flex min-h-0 min-w-0 flex-col rounded-lg border">
        <div className="flex items-center gap-1 border-b px-2 py-1.5">
          <Button
            size="sm"
            variant="ghost"
            className={cn(variant === "page" && "md:hidden")}
            onClick={() => setListOpen(true)}
            aria-label="Ver conversas"
          >
            <History className="h-4 w-4" />
            Conversas
          </Button>
          <p className="text-muted-foreground min-w-0 flex-1 truncate px-1 text-xs" title={currentTitle ?? undefined}>
            {currentTitle ?? "Nova conversa"}
          </p>
          <ToolCatalogPopover />
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4" aria-live="polite">
          {showEmpty && (
            <>
              <EmptyState icon={Bot} title={emptyTitle} description={emptyDescription} />
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((starter) => (
                  <Button
                    key={starter}
                    size="sm"
                    variant="outline"
                    className="h-auto py-1.5 text-left text-xs whitespace-normal"
                    onClick={() => submit(starter)}
                  >
                    {starter}
                  </Button>
                ))}
              </div>
            </>
          )}
          {(waitingForLatest || (conversationId && conversationQuery.isLoading)) && <LoadingState />}
          {conversationId && conversationQuery.isError && (
            <ErrorState
              message="Não foi possível abrir a conversa."
              onRetry={() => conversationQuery.refetch()}
              isRetrying={conversationQuery.isFetching}
            />
          )}

          {detail?.messages.map((item) => (
            <ChatMessageItem
              key={item.id}
              message={item}
              plan={item.planId ? plansById.get(item.planId) : undefined}
              toolDescriptions={toolDescriptions}
              highlightedPlanId={highlightedPlanId}
            />
          ))}

          {pendingMessage && (
            <>
              <UserBubble text={pendingMessage} />
              <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />O assistente está pensando… pode levar até um minuto.
              </p>
            </>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="bg-background flex items-end gap-2 rounded-b-lg border-t p-2">
          <textarea
            ref={textareaRef}
            aria-label="Mensagem para o assistente"
            value={message}
            maxLength={8000}
            rows={2}
            disabled={send.isPending}
            placeholder={send.isPending ? "Aguarde a resposta…" : "Peça uma análise ou uma mudança…"}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit(message);
              }
            }}
            className="border-input bg-background focus-visible:ring-ring min-h-10 flex-1 resize-none rounded-md border px-3 py-2 text-base focus-visible:ring-1 focus-visible:outline-none sm:text-sm"
          />
          <Button type="submit" size="icon" aria-label="Enviar" disabled={!message.trim() || send.isPending}>
            {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizontal className="h-4 w-4" />}
          </Button>
        </form>
      </div>

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent side="left" className="w-[85vw] gap-0 sm:max-w-xs">
          <SheetHeader>
            <SheetTitle>Conversas</SheetTitle>
            <SheetDescription className="sr-only">Escolha uma conversa ou comece uma nova</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{list}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
