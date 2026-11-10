import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { broadcastService } from "@/services/api/broadcastService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { broadcastStatusInfo, formatCount, progressOf, rate, recipientStatusInfo, skipReasonLabel } from "./broadcastUtils";
import { BroadcastScheduling } from "./components/broadcastScheduling";
import { BroadcastMoreActions, BroadcastResults } from "./components/broadcastResults";

const TAKE = 50;

const recipientFilters: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDING,SENDING", label: "Na fila" },
  { value: "SENT,DELIVERED", label: "Enviados" },
  { value: "READ", label: "Lidos" },
  { value: "REPLIED", label: "Responderam" },
  { value: "FAILED", label: "Falharam" },
  { value: "SKIPPED,CANCELED", label: "Fora do envio" },
];

const formatDate = (value: string | null) => (value ? format(new Date(value), "dd/MM HH:mm") : null);

const lastEvent = (recipient: BroadcastRecipient) =>
  formatDate(recipient.repliedAt ?? recipient.readAt ?? recipient.deliveredAt ?? recipient.failedAt ?? recipient.sentAt);

export const BroadcastDetail = () => {
  const { broadcastId } = useParams<{ broadcastId: string }>();
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);

  const broadcastQuery = useQuery({
    queryKey: ["broadcasts", client.id, "detail", broadcastId],
    queryFn: () => broadcastService.findOne(client.id, broadcastId!),
    refetchInterval: (current) => (current.state.data?.status === "SENDING" ? 4000 : false),
  });
  const broadcast = broadcastQuery.data;
  const sending = broadcast?.status === "SENDING";

  const recipientsQuery = useQuery({
    queryKey: ["broadcasts", client.id, "recipients", broadcastId, filter, search, page],
    queryFn: () =>
      broadcastService.findRecipients(client.id, broadcastId!, {
        page,
        take: TAKE,
        status: filter || undefined,
        search: search.trim() || undefined,
      }),
    enabled: !!broadcast,
    refetchInterval: sending ? 8000 : false,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id] });

  const actionMutation = useMutation({
    mutationFn: (action: "start" | "pause" | "cancel") => broadcastService.action(client.id, broadcastId!, action),
    onError: requestErrorHandling,
    onSuccess: (_, action) => {
      setConfirm(null);
      refresh();
      toast.success({ start: "Envio iniciado", pause: "Campanha pausada", cancel: "Campanha cancelada" }[action]);
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => broadcastService.retryFailed(client.id, broadcastId!),
    onError: requestErrorHandling,
    onSuccess: ({ retried }) => {
      refresh();
      toast.success(
        retried
          ? `${formatCount(retried)} ${retried === 1 ? "falha voltou" : "falhas voltaram"} para a fila`
          : "Nenhuma falha pode ser reenviada",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => broadcastService.remove(client.id, broadcastId!),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Rascunho excluído");
      navigate(`${baseUrl}/broadcasts`);
    },
  });

  if (broadcastQuery.isLoading) return <LoadingState label="Carregando campanha..." />;
  if (broadcastQuery.isError || !broadcast)
    return (
      <ErrorState
        message="Não foi possível abrir a campanha."
        onRetry={() => broadcastQuery.refetch()}
        isRetrying={broadcastQuery.isFetching}
      />
    );

  const info = broadcastStatusInfo[broadcast.status];
  const { totals } = broadcast;
  const canSend = can("broadcasts.send");
  const busy = actionMutation.isPending || retryMutation.isPending || deleteMutation.isPending;
  const open = ["DRAFT", "SCHEDULED", "SENDING", "PAUSED"].includes(broadcast.status);

  const metrics: { label: string; value: number; detail: string | null; tone?: string }[] = [
    { label: "Destinatários", value: totals.total, detail: totals.skipped ? `${formatCount(totals.skipped)} fora do envio` : null },
    { label: "Enviados", value: totals.sent, detail: totals.pending ? `${formatCount(totals.pending)} na fila` : null },
    {
      label: "Entregues",
      value: totals.delivered,
      detail: rate(totals.delivered, totals.sent) !== null ? `${rate(totals.delivered, totals.sent)}% dos enviados` : null,
    },
    {
      label: "Lidos",
      value: totals.read,
      detail: rate(totals.read, totals.delivered) !== null ? `${rate(totals.read, totals.delivered)}% dos entregues` : null,
    },
    {
      label: "Responderam",
      value: totals.replied,
      detail: rate(totals.replied, totals.delivered) !== null ? `${rate(totals.replied, totals.delivered)}% dos entregues` : null,
    },
    { label: "Falharam", value: totals.failed, detail: null, tone: totals.failed ? "text-destructive" : undefined },
  ];

  const recipients = recipientsQuery.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((recipientsQuery.data?.total ?? 0) / TAKE));

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`${baseUrl}/broadcasts`} aria-label="Voltar para as campanhas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{broadcast.name}</h1>
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", info.className)}>{info.label}</span>
            </div>
            <p className="text-muted-foreground text-sm break-words">
              {broadcast.templateName} ({broadcast.templateLanguage}) · {broadcast.configurationPhoneNumber ?? "número removido"}
              {broadcast.createdByName && ` · criada por ${broadcast.createdByName}`}
              {broadcast.source === "API" && " · pela API"}
              {broadcast.startedAt && ` · início ${formatDate(broadcast.startedAt)}`}
              {broadcast.finishedAt && ` · fim ${formatDate(broadcast.finishedAt)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canSend && (
            <>
              {(broadcast.status === "DRAFT" || broadcast.status === "PAUSED") && (
                <Button disabled={busy} onClick={() => actionMutation.mutate("start")}>
                  {broadcast.status === "DRAFT" ? "Iniciar envio" : "Retomar"}
                </Button>
              )}
              {sending && (
                <Button variant="outline" disabled={busy} onClick={() => actionMutation.mutate("pause")}>
                  Pausar
                </Button>
              )}
              {totals.failed > 0 && (broadcast.status === "COMPLETED" || broadcast.status === "PAUSED") && (
                <Button variant="outline" disabled={busy} onClick={() => retryMutation.mutate()}>
                  Reenviar falhas
                </Button>
              )}
              {open && broadcast.status !== "DRAFT" && (
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm("cancel")}>
                  Cancelar
                </Button>
              )}
              {broadcast.status === "DRAFT" && (
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm("delete")}>
                  Excluir rascunho
                </Button>
              )}
            </>
          )}
          <BroadcastMoreActions broadcast={broadcast} canSend={canSend} />
        </div>
      </div>

      {confirm && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm">
            {confirm === "cancel"
              ? `Cancelar a campanha? ${formatCount(totals.pending)} ${totals.pending === 1 ? "pessoa na fila não vai receber" : "pessoas na fila não vão receber"}. O que já foi enviado continua.`
              : "Excluir o rascunho e a lista de destinatários?"}
          </p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => (confirm === "cancel" ? actionMutation.mutate("cancel") : deleteMutation.mutate())}
            >
              {confirm === "cancel" ? "Cancelar campanha" : "Excluir"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm(null)}>
              Voltar
            </Button>
          </div>
        </div>
      )}

      <BroadcastScheduling
        key={`${broadcast.status}-${broadcast.sendWindow ? JSON.stringify(broadcast.sendWindow) : ""}`}
        broadcast={broadcast}
        canSend={canSend}
      />

      {broadcast.pausedReason && broadcast.status === "PAUSED" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>A campanha parou: {broadcast.pausedReason}. Resolva o motivo e clique em Retomar.</p>
        </div>
      )}

      <div className="grid gap-1">
        <Progress value={progressOf(totals)} />
        <p className="text-muted-foreground text-xs tabular-nums">
          {progressOf(totals)}% processado{sending && " · atualiza sozinho"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">{metric.label}</dt>
            <dd className={cn("text-2xl font-semibold tabular-nums", metric.tone)}>{formatCount(metric.value)}</dd>
            {metric.detail && <dd className="text-muted-foreground text-xs">{metric.detail}</dd>}
          </div>
        ))}
      </dl>

      <BroadcastResults broadcast={broadcast} />

      <section className="grid gap-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {recipientFilters.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={filter === item.value ? "secondary" : "ghost"}
                aria-pressed={filter === item.value}
                onClick={() => {
                  setFilter(item.value);
                  setPage(1);
                }}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Input
            id="broadcast-recipient-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar telefone ou nome"
            className="lg:max-w-xs"
          />
        </div>

        {recipientsQuery.isLoading && <LoadingState label="Carregando destinatários..." />}
        {recipientsQuery.isSuccess && recipients.length === 0 && (
          <EmptyState title="Ninguém neste filtro" description="Troque o filtro ou a busca." />
        )}

        {recipients.length > 0 && (
          <div className="divide-y rounded-xl border">
            {recipients.map((recipient) => {
              const status = recipientStatusInfo[recipient.status];
              const reason = recipient.errorMessage ?? (recipient.skipReason ? skipReasonLabel[recipient.skipReason] : null);
              return (
                <div
                  key={recipient.id}
                  className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium tabular-nums">{recipient.phoneNumber}</span>
                      {recipient.name && <span className="text-muted-foreground"> · {recipient.name}</span>}
                    </p>
                    {reason && (
                      <p className={cn("text-xs", recipient.status === "FAILED" ? "text-destructive" : "text-muted-foreground")}>
                        {reason}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {lastEvent(recipient) && <span className="text-muted-foreground tabular-nums">{lastEvent(recipient)}</span>}
                    <span className={cn("rounded px-1.5 py-0.5 font-medium", status.className)}>{status.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-muted-foreground tabular-nums">
              {page} de {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
