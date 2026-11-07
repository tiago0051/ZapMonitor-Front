import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { describeEvent } from "@/pages/dashboard/crm/components/dealEventText";
import { enrollmentStatusInfo, stopReasonLabel } from "@/pages/dashboard/broadcasts/sequences/sequenceUtils";
import { contactService } from "@/services/api/contactService";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { Columns3, ListOrdered, Mail, MessageCircle } from "lucide-react";
import { useState, type FC, type ReactNode } from "react";

const serviceStatusLabel: Record<number, string> = {
  1: "com a automação",
  2: "na fila",
  3: "em atendimento",
  4: "finalizado",
};

const emailStatusLabel: Record<string, string> = {
  QUEUED: "na fila de envio",
  SENT: "enviado",
  DELIVERED: "entregue",
  BOUNCED: "voltou",
  COMPLAINED: "marcado como spam",
  SUPPRESSED: "não enviado (descadastrado)",
  FAILED: "falhou",
};

const purposeLabel: Record<string, string> = { CAMPAIGN: "Campanha", FLOW: "Fluxo", SEQUENCE: "Sequência" };

type Filter = "all" | "whatsapp" | "email" | "deal";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Tudo" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mails" },
  { value: "deal", label: "Negócios" },
];

const time = (value: string) => format(new Date(value), "HH:mm");

const Entry: FC<{ icon: ReactNode; title: ReactNode; at: string; children?: ReactNode }> = ({ icon, title, at, children }) => (
  <li className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
    <span className="bg-background text-muted-foreground z-10 flex h-7 w-7 items-center justify-center rounded-full border">{icon}</span>
    <div className="min-w-0 pb-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 text-sm font-medium break-words">{title}</p>
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{time(at)}</span>
      </div>
      {children && <div className="text-muted-foreground mt-0.5 grid gap-0.5 text-xs">{children}</div>}
    </div>
  </li>
);

const EmailEntry: FC<{ item: ContactTimelineEmail }> = ({ item }) => {
  const engagement = item.clickedAt ? "clicou" : item.openedAt ? "abriu" : null;
  return (
    <Entry icon={<Mail className="h-3.5 w-3.5" />} title={item.subject} at={item.at}>
      <p>
        {purposeLabel[item.purpose] ?? "E-mail"}
        {item.label && ` · ${item.label}`} · para {item.toEmail}
      </p>
      <p>
        {emailStatusLabel[item.status] ?? item.status}
        {engagement && (
          <span className="font-medium text-green-700 dark:text-green-400">
            {" "}
            · {engagement} em {format(new Date((item.clickedAt ?? item.openedAt)!), "dd/MM HH:mm")}
          </span>
        )}
      </p>
    </Entry>
  );
};

const WhatsappEntry: FC<{ item: ContactTimelineWhatsapp }> = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <Entry icon={<MessageCircle className="h-3.5 w-3.5" />} title={`Atendimento no WhatsApp · ${item.phoneNumber}`} at={item.at}>
      <p>
        {serviceStatusLabel[item.status] ?? "atendimento"} · {item.received} recebidas, {item.sent} enviadas
      </p>
      {item.preview && <p className="text-foreground/80 line-clamp-2 italic">“{item.preview}”</p>}
      {item.summary && (
        <div>
          <button type="button" className="text-primary hover:underline" onClick={() => setExpanded(!expanded)}>
            {expanded ? "Esconder resumo" : "Ver resumo da IA"}
          </button>
          {expanded && <p className="text-foreground/80 mt-1 whitespace-pre-wrap">{item.summary}</p>}
        </div>
      )}
    </Entry>
  );
};

const DealEntry: FC<{ item: ContactTimelineDeal }> = ({ item }) => (
  <Entry
    icon={<Columns3 className="h-3.5 w-3.5" />}
    title={describeEvent({ type: item.type, payload: item.payload as DealEvent["payload"] })}
    at={item.at}
  >
    <p>
      {item.dealTitle} · {item.pipelineName}
      {item.userName && ` · por ${item.userName}`}
    </p>
  </Entry>
);

const SequenceEntry: FC<{ item: ContactTimelineSequence }> = ({ item }) => {
  const status = enrollmentStatusInfo[item.status];
  return (
    <Entry icon={<ListOrdered className="h-3.5 w-3.5" />} title={`Entrou na sequência ${item.sequenceName}`} at={item.at}>
      <p>
        <span className={cn("rounded px-1 py-px font-medium", status.className)}>{status.label}</span> ·{" "}
        {Math.min(item.sentSteps, item.totalSteps)} de {item.totalSteps} e-mails
        {item.status === "STOPPED" && item.stoppedReason && ` · ${stopReasonLabel[item.stoppedReason] ?? item.stoppedReason}`}
      </p>
    </Entry>
  );
};

const renderItem = (item: ContactTimelineItem) => {
  switch (item.kind) {
    case "email":
      return <EmailEntry key={`email-${item.id}`} item={item} />;
    case "whatsapp":
      return <WhatsappEntry key={`whatsapp-${item.id}`} item={item} />;
    case "deal":
      return <DealEntry key={`deal-${item.id}`} item={item} />;
    case "sequence":
      return <SequenceEntry key={`sequence-${item.id}`} item={item} />;
  }
};

const matches = (item: ContactTimelineItem, filter: Filter) =>
  filter === "all" || item.kind === filter || (filter === "email" && item.kind === "sequence");

/** Tudo o que aconteceu com a pessoa: atendimentos, e-mails, sequências e negócios, do mais novo ao mais antigo. */
export const ContactTimeline: FC<{ contactId: string; compact?: boolean }> = ({ contactId, compact }) => {
  const { client } = useClientContext();
  const [filter, setFilter] = useState<Filter>("all");

  const query = useInfiniteQuery({
    meta: { errorHandledInline: true },
    queryKey: ["contacts", "timeline", client.id, contactId],
    queryFn: ({ pageParam }) => contactService.timeline(client.id, contactId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextBefore ?? undefined,
  });

  const items = (query.data?.pages.flatMap((page) => page.items) ?? []).filter((item) => matches(item, filter));

  return (
    <section className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={compact ? "text-muted-foreground text-[11px] font-semibold tracking-wider uppercase" : "text-lg font-semibold"}>
          Linha do tempo
        </h2>
        <div className="flex flex-wrap gap-1">
          {filters.map((item) => (
            <Button
              key={item.value}
              size="sm"
              variant={filter === item.value ? "secondary" : "ghost"}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {query.isLoading && <LoadingState label="Carregando a linha do tempo..." />}
      {query.isError && (
        <ErrorState message="Não foi possível carregar a linha do tempo." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && !query.hasNextPage && (
        <EmptyState title="Nada por aqui ainda" description="Atendimentos, e-mails e movimentos dos negócios aparecem aqui." />
      )}

      {items.length > 0 && (
        <ol className="before:bg-border relative grid before:absolute before:top-2 before:bottom-2 before:left-[0.8125rem] before:w-px">
          {items.map((item, index) => {
            const previous = items[index - 1];
            const newDay = !previous || !isSameDay(new Date(previous.at), new Date(item.at));
            return (
              <TimelineDay key={`${item.kind}-${item.id}`} label={newDay ? format(new Date(item.at), "dd/MM/yyyy") : null}>
                {renderItem(item)}
              </TimelineDay>
            );
          })}
        </ol>
      )}

      {query.hasNextPage && (
        <Button
          variant="outline"
          size="sm"
          className="justify-self-start"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? "Carregando..." : "Ver mais antigos"}
        </Button>
      )}
    </section>
  );
};

const TimelineDay: FC<{ label: string | null; children: ReactNode }> = ({ label, children }) => (
  <>
    {label && (
      <li className="relative z-10 pb-2">
        <span className="bg-background text-muted-foreground rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums">
          {label}
        </span>
      </li>
    )}
    {children}
  </>
);
