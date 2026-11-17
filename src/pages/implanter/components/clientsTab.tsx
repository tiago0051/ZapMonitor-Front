import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { implanterService } from "@/services/api/implanterService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPlanDate } from "@/components/plan/planExpired";
import { PlanRenewControl, PlanStatusBadge } from "@/components/plan/planRenewalFields";
import { requestErrorHandling } from "@/utils/request";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useSearchParams } from "react-router";
import { DialogCreateClient } from "./dialogCreateClient";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle2, Circle, Search, X } from "lucide-react";

const STEP_LABELS: { key: keyof ImplanterClientHealth["steps"]; label: string }[] = [
  { key: "numberConnected", label: "Número de WhatsApp conectado" },
  { key: "flowOnEveryNumber", label: "Fluxo ativo em cada número" },
  { key: "groupWithPeople", label: "Grupo de atendimento com pessoas" },
  { key: "aiAgent", label: "Agente de IA criado" },
];

// Busca sem acento e sem diferença de maiúsculas
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const ClientHealth = ({ health }: { health: ImplanterClientHealth | undefined }) => {
  if (!health) return null;

  return (
    <CardContent className="flex flex-col gap-3 border-t pt-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Primeiros passos</span>
          <span className="text-muted-foreground tabular-nums">
            {health.completedSteps} de {health.totalSteps}
          </span>
        </div>
        <Progress value={(health.completedSteps / health.totalSteps) * 100} aria-label="Progresso dos primeiros passos" />
        <ul className="grid gap-1 pt-1 text-xs">
          {STEP_LABELS.map((step) => (
            <li key={step.key} className="flex items-center gap-1.5">
              {health.steps[step.key] ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" aria-label="Feito" />
              ) : (
                <Circle className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-label="Pendente" />
              )}
              <span className={health.steps[step.key] ? "" : "text-muted-foreground"}>{step.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-muted-foreground text-xs">
        {health.lastServiceAt
          ? `Último atendimento ${formatDistanceToNow(new Date(health.lastServiceAt), { locale: ptBR, addSuffix: true })}`
          : "Nenhum atendimento ainda"}
      </p>

      {health.alerts.length > 0 && (
        <ul className="grid gap-1">
          {health.alerts.map((alert, index) => (
            <li key={`${alert.type}-${index}`} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{alert.message}</span>
            </li>
          ))}
        </ul>
      )}
    </CardContent>
  );
};

export const ClientsTab = () => {
  const findClientsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["implanterClients"],
    queryFn: implanterService.findClients,
  });

  // A saúde vem separada para a lista aparecer logo, mesmo com muitos tenants
  const findHealthQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["implanterClients", "health"],
    queryFn: implanterService.findClientsHealth,
  });
  const healthByClient = new Map(findHealthQuery.data?.map((item) => [item.clientId, item]));

  // Busca e filtro na URL, junto com a aba
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const onlyAlerts = searchParams.get("alerts") === "1";
  const updateParam = (key: string, value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  const queryClient = useQueryClient();
  const renewPlan = useMutation({
    mutationFn: implanterService.renewClientPlan,
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      queryClient.setQueryData<ImplanterClient[]>(["implanterClients"], (current) =>
        current?.map((client) => (client.id === updated.id ? updated : client)),
      );
      toast.success(
        `${updated.name} renovado até ${updated.plan.dueDate ? formatPlanDate(updated.plan.dueDate) : "—"}. O acesso dos usuários já voltou.`,
      );
    },
  });

  // Vencidos e os que vencem primeiro aparecem antes
  const allClients = findClientsQuery.data
    ?.slice()
    .sort((first, second) => (first.plan.daysUntilDue ?? Infinity) - (second.plan.daysUntilDue ?? Infinity));
  const normalizedSearch = normalize(search.trim());
  const clients = allClients?.filter(
    (client) =>
      (!normalizedSearch || normalize(client.name).includes(normalizedSearch)) &&
      (!onlyAlerts || (healthByClient.get(client.id)?.alerts.length ?? 0) > 0),
  );
  const withAlerts = allClients?.filter((client) => (healthByClient.get(client.id)?.alerts.length ?? 0) > 0).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            type="search"
            aria-label="Buscar tenant"
            placeholder="Buscar tenant pelo nome"
            value={search}
            onChange={(event) => updateParam("q", event.currentTarget.value)}
            className="pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
          />
          {search && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => updateParam("q", "")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          variant={onlyAlerts ? "default" : "outline"}
          size="sm"
          aria-pressed={onlyAlerts}
          disabled={!onlyAlerts && withAlerts === 0}
          onClick={() => updateParam("alerts", onlyAlerts ? "" : "1")}
        >
          <AlertTriangle className="h-4 w-4" />
          Com alertas{findHealthQuery.data ? ` (${withAlerts})` : ""}
        </Button>
        <div className="flex items-center justify-between gap-2 sm:ml-auto">
          <p className="text-muted-foreground text-sm">
            {clients ? `${clients.length} ${clients.length === 1 ? "tenant" : "tenants"}` : ""}
          </p>
          <DialogCreateClient />
        </div>
      </div>
      {findHealthQuery.isError && <p className="text-muted-foreground text-xs">Não foi possível carregar o andamento dos tenants agora.</p>}

      {findClientsQuery.isLoading && <LoadingState />}
      {findClientsQuery.isError && (
        <ErrorState
          message="Não foi possível buscar os tenants."
          onRetry={() => findClientsQuery.refetch()}
          isRetrying={findClientsQuery.isFetching}
        />
      )}
      {allClients && allClients.length === 0 && (
        <EmptyState title="Nenhum tenant cadastrado" description="Crie o primeiro tenant pelo botão acima." />
      )}
      {allClients && allClients.length > 0 && clients?.length === 0 && (
        <EmptyState title="Nenhum tenant encontrado" description="Mude a busca ou tire o filtro de alertas." />
      )}

      {clients && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="gap-3">
              <CardHeader>
                <CardTitle className="truncate">{client.name}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2">
                  Criado em {format(client.createdAt, "dd/MM/yyyy")}
                  <PlanStatusBadge status={client.plan} />
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-2">
                <p className="text-sm">
                  {client.activeMembers} {client.activeMembers === 1 ? "usuário ativo" : "usuários ativos"}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/dashboard/client/${client.id}`}>Abrir</Link>
                </Button>
              </CardContent>
              <ClientHealth health={healthByClient.get(client.id)} />
              {client.isRepresentative && client.plan.dueDate && (
                <CardContent className="border-t pt-3">
                  <PlanRenewControl
                    status={client.plan}
                    isPending={renewPlan.isPending && renewPlan.variables?.clientId === client.id}
                    onRenew={(months) => renewPlan.mutate({ clientId: client.id, months })}
                  />
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
