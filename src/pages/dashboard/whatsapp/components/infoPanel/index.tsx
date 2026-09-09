import { ContactAvatar } from "@/components/contact-avatar";
import { Bot, FileAudio, FileText, Film, Image as ImageIcon, Paperclip, Tag } from "lucide-react";
import { formatBoldText, formatPhoneNumber, formatShortId } from "@/utils/formatString";
import { useInfiniteQuery } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useEffect } from "react";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { IsTopScrolled } from "@/utils/scroll";
import { format } from "date-fns";

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
        <p className="text-muted-foreground text-[10px]">{format(new Date(message.createdAt), "PPp")}</p>
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

export function InfoPanel({
  selected,
  rightPanel,
  setRightPanel,
}: {
  selected: WhatsappContactMessage;
  rightPanel: "summary" | "history" | "files";
  setRightPanel: (p: "summary" | "history" | "files") => void;
}) {
  const { client } = useClientContext();
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
      <div className="border-border flex flex-shrink-0 border-b">
        <button
          onClick={() => setRightPanel("summary")}
          className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            rightPanel === "summary" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Resumo IA
          {rightPanel === "summary" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
        <button
          onClick={() => setRightPanel("history")}
          className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            rightPanel === "history" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Histórico
          {rightPanel === "history" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
        <button
          onClick={() => setRightPanel("files")}
          className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            rightPanel === "files" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Paperclip className="h-3.5 w-3.5" />
          Arquivos
          {rightPanel === "files" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
      </div>

      <div className="border-border bg-muted/40 flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <ContactAvatar contact={selected} size="sm" />
          <div>
            <p className="text-foreground text-xs font-semibold">{selected.name}</p>
            <p className="text-muted-foreground text-[11px]">{formatPhoneNumber(selected.phoneNumber)}</p>
          </div>
        </div>
      </div>

      <div
        className="scrollbar-hide flex-1 overflow-y-auto px-4 py-4"
        onScroll={rightPanel === "files" ? onScrollFiles : undefined}
      >
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
                {formatBoldText(aiSummary)}
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
        ) : rightPanel === "history" ? (
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">Atendimentos anteriores</p>
            {services.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sem histórico.</p>
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
                        {formatBoldText(p.aiResume)}
                      </pre>
                    )}

                    {p.actions.map((action) => (
                      <div
                        key={action.id}
                        data-type={action.type}
                        className="rounded border p-2 data-[type='1']:bg-blue-50 data-[type='2']:bg-yellow-50 data-[type='3']:bg-green-50"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-foreground/50 text-sm">{new Date(action.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm">{action.annotation}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">Arquivos compartilhados</p>
            {files.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sem arquivos.</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <FileListItem key={file.id} message={file as WhatsappMessage<MessageFileContent>} />
                ))}
              </div>
            )}
            {findAllFilesByContact.isFetchingNextPage && <p className="text-muted-foreground mt-2 text-center text-[11px]">Carregando...</p>}
          </div>
        )}
      </div>
    </div>
  );
}
