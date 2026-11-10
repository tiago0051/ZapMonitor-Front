import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { emailCampaignService } from "@/services/api/emailCampaignService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Download } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { formatCount, rate } from "../broadcastUtils";
import { BroadcastScheduling, type SchedulingApi } from "../components/broadcastScheduling";
import { downloadBlob, emailCampaignStatusInfo, emailProgressOf, emailRecipientStatusInfo } from "./emailCampaignUtils";
import { EmailAbResults } from "./emailAbResults";
import { EmailPreviewFrame } from "./emailPreviewFrame";

const TAKE = 50;

const recipientFilters: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "PENDING,SENDING", label: "Na fila" },
  { value: "SENT,DELIVERED", label: "Entregues" },
  { value: "OPENED", label: "Abriram" },
  { value: "CLICKED", label: "Clicaram" },
  { value: "BOUNCED,COMPLAINED,FAILED", label: "Problemas" },
  { value: "SKIPPED,CANCELED", label: "Fora do envio" },
];

const schedulingApi: SchedulingApi = {
  queryKey: "emailCampaigns",
  schedule: emailCampaignService.schedule,
  unschedule: (clientId, id) => emailCampaignService.action(clientId, id, "unschedule"),
  action: emailCampaignService.action,
  setSendWindow: emailCampaignService.setSendWindow,
};

const formatDate = (value: string | null) => (value ? format(new Date(value), "dd/MM HH:mm") : null);

const lastEvent = (recipient: EmailCampaignRecipient) =>
  formatDate(recipient.clickedAt ?? recipient.openedAt ?? recipient.deliveredAt ?? recipient.sentAt);

const share = (part: number, base: number, of: string) => {
  const value = rate(part, base);
  return value === null ? null : `${value}% ${of}`;
};

export const EmailCampaignDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<"cancel" | "delete" | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const campaignQuery = useQuery({
    queryKey: ["emailCampaigns", client.id, "detail", campaignId],
    queryFn: () => emailCampaignService.findOne(client.id, campaignId!),
    refetchInterval: (current) => (current.state.data?.status === "SENDING" ? 4000 : false),
  });
  const campaign = campaignQuery.data;
  const sending = campaign?.status === "SENDING";

  const recipientsQuery = useQuery({
    queryKey: ["emailCampaigns", client.id, "recipients", campaignId, filter, search, page],
    queryFn: () =>
      emailCampaignService.findRecipients(client.id, campaignId!, {
        page,
        take: TAKE,
        status: filter || undefined,
        search: search.trim() || undefined,
      }),
    enabled: !!campaign,
    refetchInterval: sending ? 8000 : false,
  });

  const previewQuery = useQuery({
    queryKey: ["emailCampaigns", client.id, "preview", "campaign", campaignId],
    queryFn: () => emailCampaignService.preview(client.id, { campaignId }),
    enabled: showPreview,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["emailCampaigns", client.id] });

  const actionMutation = useMutation({
    mutationFn: (action: "start" | "pause" | "cancel") => emailCampaignService.action(client.id, campaignId!, action),
    onError: requestErrorHandling,
    onSuccess: (updated, action) => {
      setConfirm(null);
      refresh();
      if (action === "start" && updated.status === "SCHEDULED") toast.info("Fora da janela de envio; começa no próximo horário permitido");
      else toast.success({ start: "Envio iniciado", pause: "Campanha pausada", cancel: "Campanha cancelada" }[action]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => emailCampaignService.remove(client.id, campaignId!),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Rascunho excluído");
      navigate(`${baseUrl}/broadcasts?canal=email`);
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => emailCampaignService.exportRecipients(client.id, campaignId!),
    onError: requestErrorHandling,
    onSuccess: (blob) => downloadBlob(blob, `${campaign?.name ?? "campanha"}.csv`),
  });

  if (campaignQuery.isLoading) return <LoadingState label="Carregando campanha..." />;
  if (campaignQuery.isError || !campaign)
    return (
      <ErrorState
        message="Não foi possível abrir a campanha."
        onRetry={() => campaignQuery.refetch()}
        isRetrying={campaignQuery.isFetching}
      />
    );

  const info = emailCampaignStatusInfo[campaign.status];
  const { totals } = campaign;
  const canSend = can("broadcasts.send");
  const busy = actionMutation.isPending || deleteMutation.isPending;
  const open = ["DRAFT", "SCHEDULED", "SENDING", "PAUSED"].includes(campaign.status);

  const metrics: { label: string; value: number; detail: string | null; tone?: string }[] = [
    { label: "Destinatários", value: totals.total, detail: totals.skipped ? `${formatCount(totals.skipped)} fora do envio` : null },
    { label: "Enviados", value: totals.sent, detail: totals.pending ? `${formatCount(totals.pending)} na fila` : null },
    { label: "Entregues", value: totals.delivered, detail: share(totals.delivered, totals.sent, "dos enviados") },
    { label: "Abriram", value: totals.opened, detail: share(totals.opened, totals.delivered, "dos entregues") },
    { label: "Clicaram", value: totals.clicked, detail: share(totals.clicked, totals.delivered, "dos entregues") },
    {
      label: "Voltaram",
      value: totals.bounced,
      detail: share(totals.bounced, totals.sent, "dos enviados"),
      tone: totals.bounced ? "text-destructive" : undefined,
    },
    {
      label: "Spam",
      value: totals.complained,
      detail: share(totals.complained, totals.delivered, "dos entregues"),
      tone: totals.complained ? "text-destructive" : undefined,
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
            <Link to={`${baseUrl}/broadcasts?canal=email`} aria-label="Voltar para as campanhas">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{campaign.name}</h1>
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", info.className)}>{info.label}</span>
              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs">E-mail</span>
            </div>
            <p className="text-muted-foreground text-sm break-words">
              {campaign.subject}
              {campaign.frequencyCapDays && ` · sem repetir em ${campaign.frequencyCapDays} dias`}
              {campaign.startedAt && ` · início ${formatDate(campaign.startedAt)}`}
              {campaign.finishedAt && ` · fim ${formatDate(campaign.finishedAt)}`}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canSend && (
            <>
              {(campaign.status === "DRAFT" || campaign.status === "PAUSED") && (
                <Button disabled={busy} onClick={() => actionMutation.mutate("start")}>
                  {campaign.status === "DRAFT" ? "Iniciar envio" : "Retomar"}
                </Button>
              )}
              {sending && (
                <Button variant="outline" disabled={busy} onClick={() => actionMutation.mutate("pause")}>
                  Pausar
                </Button>
              )}
              {open && campaign.status !== "DRAFT" && (
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm("cancel")}>
                  Cancelar
                </Button>
              )}
              {campaign.status === "DRAFT" && (
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm("delete")}>
                  Excluir rascunho
                </Button>
              )}
            </>
          )}
          <Button variant="outline" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
            <Download className="mr-2 h-4 w-4" />
            Planilha
          </Button>
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
        key={`${campaign.status}-${campaign.sendWindow ? JSON.stringify(campaign.sendWindow) : ""}`}
        broadcast={campaign}
        canSend={canSend}
        api={schedulingApi}
      />

      {campaign.pausedReason && campaign.status === "PAUSED" && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>A campanha parou: {campaign.pausedReason}. Resolva o motivo e clique em Retomar.</p>
        </div>
      )}

      <div className="grid gap-1">
        <Progress value={emailProgressOf(totals)} />
        <p className="text-muted-foreground text-xs tabular-nums">
          {emailProgressOf(totals)}% processado{sending && " · atualiza sozinho"}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border p-3">
            <dt className="text-muted-foreground text-xs">{metric.label}</dt>
            <dd className={cn("text-2xl font-semibold tabular-nums", metric.tone)}>{formatCount(metric.value)}</dd>
            {metric.detail && <dd className="text-muted-foreground text-xs">{metric.detail}</dd>}
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-xs">
        Aberturas são aproximadas: alguns aplicativos de e-mail abrem as imagens sozinhos e outros bloqueiam. Cliques são mais confiáveis.
      </p>

      {campaign.abTest && <EmailAbResults campaign={campaign} subjectA={campaign.subject} />}

      {!!campaign.links?.length && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Links mais clicados</h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left text-xs">
                <tr>
                  <th className="px-4 py-2 font-medium">Link</th>
                  <th className="px-4 py-2 text-right font-medium">Pessoas</th>
                  <th className="px-4 py-2 text-right font-medium">Cliques</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaign.links.map((link) => (
                  <tr key={link.url}>
                    <td className="max-w-0 px-4 py-2">
                      <a href={link.url} target="_blank" rel="noreferrer" className="block truncate hover:underline" title={link.url}>
                        {link.url}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCount(link.people)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatCount(link.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="grid gap-2">
        <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? "Esconder o e-mail" : "Ver o e-mail enviado"}
        </Button>
        {showPreview && (
          <EmailPreviewFrame
            className="max-w-3xl"
            subject={previewQuery.data?.subject}
            html={previewQuery.data?.html}
            isLoading={previewQuery.isLoading}
            note="Conteúdo copiado do modelo ao criar a campanha, com os valores padrão das variáveis."
          />
        )}
      </section>

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
            id="email-campaign-recipient-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Buscar e-mail ou nome"
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
              const status = emailRecipientStatusInfo[recipient.status];
              const reason = recipient.error ?? recipient.skipReason;
              const problem = ["FAILED", "BOUNCED", "COMPLAINED"].includes(recipient.status);
              return (
                <div
                  key={recipient.id}
                  className="grid gap-1 px-4 py-2.5 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{recipient.email}</span>
                      {recipient.name && <span className="text-muted-foreground"> · {recipient.name}</span>}
                      {recipient.variant && <span className="text-muted-foreground"> · assunto {recipient.variant}</span>}
                    </p>
                    {reason && <p className={cn("text-xs", problem ? "text-destructive" : "text-muted-foreground")}>{reason}</p>}
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
