import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { emailCampaignService } from "@/services/api/emailCampaignService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { formatCount, rate } from "../broadcastUtils";
import { emailCampaignStatusInfo, emailProgressOf } from "./emailCampaignUtils";

const TAKE = 20;

const statusFilters: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "SENDING", label: "Enviando" },
  { value: "SCHEDULED", label: "Agendadas" },
  { value: "PAUSED", label: "Pausadas" },
  { value: "DRAFT", label: "Rascunhos" },
  { value: "COMPLETED", label: "Concluídas" },
];

const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

/** Campanhas de e-mail com os totais de entrega, abertura e clique. */
export const EmailCampaignList = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["emailCampaigns", client.id, status, page],
    queryFn: () => emailCampaignService.findAll(client.id, { page, take: TAKE, status: status || undefined }),
    refetchInterval: (current) => (current.state.data?.items.some((item) => item.status === "SENDING") ? 5000 : false),
  });

  const items = query.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / TAKE));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={status === filter.value ? "secondary" : "ghost"}
              aria-pressed={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        {can("broadcasts.send") && (
          <Button asChild>
            <Link to={`${baseUrl}/broadcasts/email/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nova campanha de e-mail
            </Link>
          </Button>
        )}
      </div>

      {query.isLoading && <LoadingState label="Carregando campanhas..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar as campanhas." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title={status ? "Nenhuma campanha com esse status" : "Nenhuma campanha de e-mail ainda"}
          description="Escolha um remetente verificado e um modelo, e envie para as fichas do CRM, das etiquetas ou de uma planilha."
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-2">
          {items.map((campaign) => {
            const info = emailCampaignStatusInfo[campaign.status];
            const { totals } = campaign;
            const problems = totals.bounced + totals.complained + totals.failed;
            return (
              <Link
                key={campaign.id}
                to={`${baseUrl}/broadcasts/email/${campaign.id}`}
                className="hover:bg-accent/40 focus-visible:ring-ring grid gap-3 rounded-xl border p-4 outline-none focus-visible:ring-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{campaign.name}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", info.className)}>{info.label}</span>
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {campaign.subject} · {format(new Date(campaign.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="grid gap-1">
                  <Progress value={emailProgressOf(totals)} />
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {formatCount(totals.total - totals.pending)} de {formatCount(totals.total)} processados
                  </p>
                </div>
                <dl className="grid grid-cols-4 gap-2 text-xs tabular-nums">
                  <div>
                    <dt className="text-muted-foreground">Entregues</dt>
                    <dd className="font-medium">{formatCount(totals.delivered)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Abertos</dt>
                    <dd className="font-medium">{percent(rate(totals.opened, totals.delivered))}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Cliques</dt>
                    <dd className="font-medium">{percent(rate(totals.clicked, totals.delivered))}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Problemas</dt>
                    <dd className={cn("font-medium", problems > 0 && "text-destructive")}>{formatCount(problems)}</dd>
                  </div>
                </dl>
              </Link>
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
    </div>
  );
};
