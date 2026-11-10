import { ContactAvatar } from "@/components/contact-avatar";
import { Bot, Briefcase, FileAudio, FileText, Film, Image as ImageIcon, Paperclip, Tag, UserRound } from "lucide-react";
import { ContactProfile } from "@/pages/dashboard/contacts/components/contactProfile";
import { ContactDeals } from "@/pages/dashboard/crm/components/contactDeals";
import { formatWhatsappText, formatPhoneNumber, formatShortId } from "@/utils/formatString";
import { useInfiniteQuery } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useEffect } from "react";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { IsTopScrolled } from "@/utils/scroll";
import { format } from "date-fns";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";

type MessageFileContent = { url: string; filename: string };

const fileTypeIcons: Partial<Record<WhatsappMessageContentType, typeof FileText>> = {
  [WhatsappMessageContentType.DOCUMENT]: FileText,
  [WhatsappMessageContentType.IMAGE]: ImageIcon,
  [WhatsappMessageContentType.VIDEO]: Film,
  [WhatsappMessageContentType.AUDIO]: FileAudio,
};

function FileListItem({ message }: { message: WhatsappMessage<MessageFileContent> }) {
  const Icon = fileTypeIcons[message.contentType as WhatsappMessageContentType] || FileText;
  const content = message.content;

  return (
    <a
      href={content?.url}
      target="_blank"
      rel="noreferrer"
      download
      className="border-border bg-card hover:bg-muted/40 flex items-center gap-2.5 rounded-xl border p-2.5 transition-colors"
    >
      <div className="bg-muted flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg">
        <Icon className="text-muted-foreground h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-foreground truncate text-xs font-medium">{content?.filename || "Arquivo"}</p>
        <p className="text-muted-foreground text-[10px]">{format(new Date(message.createdAt), "dd/MM/yyyy HH:mm")}</p>
      </div>
    </a>
  );
}

function StatusDot({ status }: { status: ProtocolStatus }) {
  const colors: Record<ProtocolStatus, string> = {
    resolved: "bg-green-400",
    open: "bg-amber-400",
    transferred: "bg-blue-400",
  };
  return <span className={`h-2 w-2 flex-shrink-0 rounded-full ${colors[status]}`} />;
}

// Tipos de ação do atendimento (mesmos números do back-end)
const serviceActionInfo: Record<number, { label: string; className: string }> = {
  1: { label: "Início", className: "bg-blue-50 dark:bg-blue-950/40" },
  2: { label: "Transferência", className: "bg-yellow-50 dark:bg-yellow-950/40" },
  3: { label: "Encerramento", className: "bg-green-50 dark:bg-green-950/40" },
  4: { label: "Encerrado por tempo", className: "bg-green-50 dark:bg-green-950/40" },
  5: { label: "Etapa do fluxo", className: "bg-muted/60" },
};

export type InfoPanelTab = "summary" | "contact" | "history" | "files" | "deals";

export function InfoPanel({
  selected,
  rightPanel,
  setRightPanel,
  onProfileDirtyChange,
}: {
  selected: WhatsappContactMessage;
  rightPanel: InfoPanelTab;
  setRightPanel: (p: InfoPanelTab) => void;
  /** Avisa se a ficha aberta na aba "Ficha" tem alterações não salvas */
  onProfileDirtyChange?: (isDirty: boolean) => void;
}) {
  const { client, canUseCrm, can } = useClientContext();
  const { socket, isConnected } = useSocketContext();

  const findAllServicesHistoryByContact = useInfiniteQuery({
    queryKey: [`contact-${selected.id}`, "findAllServiceHistoryByContact", { contactId: selected.id }, client.id],
    queryFn: ({ pageParam }) =>
      whatsappService.findAllServicesHistoryByContact({
        params: { contactId: selected.id, clientId: client.id },
        queries: { page: pageParam, take: 10 },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
  });

  useEffect(() => {
    const handleServiceUpdate = () => {
      findAllServicesHistoryByContact.refetch();
    };

    socket.on(`contact:${selected.id}:service:update`, handleServiceUpdate);

    return () => {
      socket.off(`contact:${selected.id}:service:update`, handleServiceUpdate);
    };
  }, [selected.id, isConnected, socket]);

  const findAllFilesByContact = useInfiniteQuery({
    queryKey: [`contact-${selected.id}`, "findAllFilesByContact", { contactId: selected.id }, client.id],
    queryFn: ({ pageParam }) =>
      whatsappService.findAllFilesByContact({
        params: { contactId: selected.id, clientId: client.id },
        queries: { page: pageParam, take: 20 },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
    enabled: rightPanel === "files",
  });

  function onScrollFiles(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const isBottomScrolled = IsTopScrolled(event.currentTarget);

    if (isBottomScrolled && findAllFilesByContact.hasNextPage && !findAllFilesByContact.isFetching) {
      findAllFilesByContact.fetchNextPage();
    }
  }

  const files = findAllFilesByContact.data?.pages.flatMap((page) => page.items) || [];

  const services = findAllServicesHistoryByContact.data?.pages.flatMap((page) => page.items) || [];
  const afterService = services[1];
  const nowService = services[0];
  const presentationService = nowService || afterService;

  const aiSummary = presentationService?.aiResume;

  return (
    <div className="bg-card flex h-full flex-col">
      <div className="border-border scrollbar-hide flex flex-shrink-0 overflow-x-auto border-b">
        <button
          type="button"
          aria-pressed={rightPanel === "summary"}
          onClick={() => setRightPanel("summary")}
          className={`relative flex flex-1 shrink-0 items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
            rightPanel === "summary" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Resumo IA
          {rightPanel === "summary" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
        {can("contacts.view") && (
          <button
            type="button"
            aria-pressed={rightPanel === "contact"}
            onClick={() => setRightPanel("contact")}
            className={`relative flex flex-1 shrink-0 items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
              rightPanel === "contact" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" />
            Ficha
            {rightPanel === "contact" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
          </button>
        )}
        <button
          type="button"
          aria-pressed={rightPanel === "history"}
          onClick={() => setRightPanel("history")}
          className={`relative flex flex-1 shrink-0 items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
            rightPanel === "history" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Histórico
          {rightPanel === "history" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
        <button
          type="button"
          aria-pressed={rightPanel === "files"}
          onClick={() => setRightPanel("files")}
          className={`relative flex flex-1 shrink-0 items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
            rightPanel === "files" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Arquivos
          {rightPanel === "files" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
        {canUseCrm && (
          <button
            type="button"
            aria-pressed={rightPanel === "deals"}
            onClick={() => setRightPanel("deals")}
            className={`relative flex flex-1 shrink-0 items-center justify-center gap-1.5 px-2 py-3 text-xs font-medium whitespace-nowrap transition-colors ${
              rightPanel === "deals" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            Negócios
            {rightPanel === "deals" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
          </button>
        )}
      </div>

      <div className="border-border bg-muted/40 flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <ContactAvatar contact={selected} size="sm" />
          <div className="min-w-0">
            <p className="text-foreground truncate text-xs font-semibold">{selected.name}</p>
            <p className="text-muted-foreground text-[11px]">{formatPhoneNumber(selected.phoneNumber)}</p>
          </div>
        </div>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-4" onScroll={rightPanel === "files" ? onScrollFiles : undefined}>
        {rightPanel === "summary" ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100">
                <Bot className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-foreground text-xs font-semibold">Análise automática</span>
            </div>
            {aiSummary ? (
              <pre className="text-muted-foreground bg-muted rounded-xl p-3 text-xs leading-relaxed hyphens-auto whitespace-pre-wrap">
                {formatWhatsappText(aiSummary)}
              </pre>
            ) : (
              <p className="text-muted-foreground text-xs">Sem resumo disponível.</p>
            )}
            {selected.categories && selected.categories.length > 0 && (
              <div className="mt-4">
                <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.categories.map((t) => (
                    <span
                      key={t.id}
                      className="text-foreground bg-muted inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium"
                    >
                      <Tag className="text-muted-foreground h-2.5 w-2.5" />
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : rightPanel === "contact" && can("contacts.view") ? (
          <ContactProfile key={selected.id} conversationId={selected.id} compact onDirtyChange={onProfileDirtyChange} />
        ) : rightPanel === "deals" && canUseCrm ? (
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">Negócios do contato</p>
            <ContactDeals contact={selected} />
          </div>
        ) : rightPanel === "history" ? (
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">Atendimentos anteriores</p>
            {findAllServicesHistoryByContact.isLoading ? (
              <LoadingState label="Carregando histórico..." />
            ) : findAllServicesHistoryByContact.isError ? (
              <ErrorState
                message="Não foi possível carregar o histórico."
                onRetry={() => findAllServicesHistoryByContact.refetch()}
                isRetrying={findAllServicesHistoryByContact.isFetching}
              />
            ) : services.length === 0 ? (
              <EmptyState icon={FileText} title="Sem histórico" description="Os atendimentos deste contato aparecem aqui." />
            ) : (
              <div className="space-y-3">
                {services.map((p) => (
                  <div key={p.id} className="border-border bg-card rounded-xl border p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-foreground text-xs font-semibold uppercase">P-{formatShortId(p.id)}</span>
                      <div className="flex items-center gap-1">
                        <StatusDot status={p.finished ? "resolved" : "open"} />
                        <span className="text-muted-foreground text-[10px]">{p.finished ? "Resolvido" : "Aberto"}</span>
                      </div>
                    </div>
                    {p?.aiResume && (
                      <pre className="text-muted-foreground mb-2 text-[11px] leading-relaxed hyphens-auto whitespace-pre-wrap">
                        {formatWhatsappText(p.aiResume)}
                      </pre>
                    )}

                    <div className="space-y-1.5">
                      {p.actions.map((action) => {
                        const info = serviceActionInfo[action.type];
                        return (
                          <div key={action.id} className={`rounded border p-2 ${info?.className ?? ""}`}>
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-foreground text-xs font-semibold">{info?.label ?? "Ação"}</span>
                              <span className="text-muted-foreground text-[11px] tabular-nums">
                                {format(new Date(action.createdAt), "dd/MM/yyyy HH:mm")}
                              </span>
                            </div>
                            {action.annotation && <p className="text-sm">{action.annotation}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">Arquivos compartilhados</p>
            {findAllFilesByContact.isLoading ? (
              <LoadingState label="Carregando arquivos..." />
            ) : findAllFilesByContact.isError && files.length === 0 ? (
              <ErrorState
                message="Não foi possível carregar os arquivos."
                onRetry={() => findAllFilesByContact.refetch()}
                isRetrying={findAllFilesByContact.isFetching}
              />
            ) : files.length === 0 ? (
              <EmptyState
                icon={Paperclip}
                title="Sem arquivos"
                description="Fotos, vídeos, áudios e documentos da conversa aparecem aqui."
              />
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <FileListItem key={file.id} message={file as WhatsappMessage<MessageFileContent>} />
                ))}
              </div>
            )}
            {findAllFilesByContact.isFetchingNextPage && (
              <p className="text-muted-foreground mt-2 text-center text-[11px]">Carregando...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
