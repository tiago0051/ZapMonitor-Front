import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { broadcastService } from "@/services/api/broadcastService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { broadcastStatusInfo, formatCount, progressOf, rate } from "./broadcastUtils";
import { OptOutList } from "./components/optOutList";

const TAKE = 20;

const statusFilters: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "SENDING", label: "Enviando" },
  { value: "PAUSED", label: "Pausadas" },
  { value: "DRAFT", label: "Rascunhos" },
  { value: "COMPLETED", label: "Concluídas" },
];

const BroadcastList = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["broadcasts", client.id, status, page],
    queryFn: () => broadcastService.findAll(client.id, { page, take: TAKE, status: status || undefined }),
    // Enquanto há envio em andamento, os totais se atualizam sozinhos
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
            <Link to={`${baseUrl}/broadcasts/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nova campanha
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
          title={status ? "Nenhuma campanha com esse status" : "Nenhuma campanha ainda"}
          description="Monte uma campanha com um modelo aprovado e o público do CRM, das etiquetas ou de uma planilha."
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-2">
          {items.map((broadcast) => {
            const info = broadcastStatusInfo[broadcast.status];
            const { totals } = broadcast;
            const readRate = rate(totals.read, totals.delivered);
            const replyRate = rate(totals.replied, totals.delivered);
            return (
              <Link
                key={broadcast.id}
                to={`${baseUrl}/broadcasts/${broadcast.id}`}
                className="hover:bg-accent/40 focus-visible:ring-ring grid gap-3 rounded-xl border p-4 outline-none focus-visible:ring-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] md:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-semibold">{broadcast.name}</span>
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", info.className)}>{info.label}</span>
                    {broadcast.source === "API" && (
                      <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px]">API</span>
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-xs">
                    {broadcast.templateName} · {broadcast.configurationPhoneNumber ?? "número removido"} ·{" "}
                    {format(new Date(broadcast.createdAt), "dd/MM/yyyy HH:mm")}
                  </p>
                </div>
                <div className="grid gap-1">
                  <Progress value={progressOf(totals)} />
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
                    <dt className="text-muted-foreground">Lidos</dt>
                    <dd className="font-medium">{readRate === null ? "—" : `${readRate}%`}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Respostas</dt>
                    <dd className="font-medium">{replyRate === null ? "—" : `${replyRate}%`}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Falhas</dt>
                    <dd className={cn("font-medium", totals.failed > 0 && "text-destructive")}>{formatCount(totals.failed)}</dd>
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

export const Broadcasts = () => (
  <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
    <div>
      <h1 className="text-2xl font-semibold">Campanhas</h1>
      <p className="text-muted-foreground text-sm">
        Disparos em massa de modelos do WhatsApp, com entrega, leitura e respostas de cada pessoa.
      </p>
    </div>

    <Tabs defaultValue="broadcasts">
      <TabsList>
        <TabsTrigger value="broadcasts">Campanhas</TabsTrigger>
        <TabsTrigger value="optOut">Descadastrados</TabsTrigger>
      </TabsList>
      <TabsContent value="broadcasts" className="pt-2">
        <BroadcastList />
      </TabsContent>
      <TabsContent value="optOut" className="pt-2">
        <OptOutList />
      </TabsContent>
    </Tabs>
  </div>
);
