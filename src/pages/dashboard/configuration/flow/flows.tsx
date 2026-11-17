import { EmptyState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandableDescription } from "../components/expandableDescription";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  ArrowRight,
  Copy,
  CornerDownRight,
  Pencil,
  Phone,
  Search,
  Users,
  Workflow,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { findFlowSources, findFlowTargetIds, useWhatsappConfigurations } from "./flowLinks";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { DialogCreateFlow } from "./components/dialogCreateFlow";

type FlowFilter = "active" | "inactive" | "archived";

const FLOW_FILTERS: { id: FlowFilter; label: string }[] = [
  { id: "active", label: "Ativos" },
  { id: "inactive", label: "Inativos" },
  { id: "archived", label: "Arquivados" },
];

const matchesFilter = (flow: Flow, filter: FlowFilter) =>
  filter === "archived" ? !!flow.archivedAt : !flow.archivedAt && (filter === "active" ? flow.active : !flow.active);

// Normaliza para a busca ignorar acentos e maiúsculas
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const Flows = () => {
  const { clientId } = useParams();

  const findAllFlowsQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["flows", clientId],
    queryFn: () => flowService.findAll({ params: { clientId: clientId! } }),
  });

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const duplicateFlow = useMutation({
    mutationFn: flowService.duplicate,
    onError: requestErrorHandling,
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ["flows", clientId] });
      toast.success(`Cópia criada: ${copy.name}`, {
        description: "Ela nasce inativa e sem número. Publique e ative quando estiver pronta.",
      });
      navigate(`flow/${copy.id}`);
    },
  });

  const archiveFlow = useMutation({
    mutationFn: ({ flow, archive }: { flow: Flow; archive: boolean }) =>
      (archive ? flowService.archive : flowService.unarchive)({ params: { clientId: clientId!, flowId: flow.id } }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["flows", clientId] });
      toast.success(saved.archivedAt ? `"${saved.name}" arquivado` : `"${saved.name}" desarquivado. Ele volta como inativo.`);
    },
  });

  const flows = findAllFlowsQuery.data;
  const [filter, setFilter] = useState<FlowFilter>("active");
  const [search, setSearch] = useState("");
  const countOf = (item: FlowFilter) => flows.filter((flow) => matchesFilter(flow, item)).length;
  const visibleFlows = flows.filter((flow) => matchesFilter(flow, filter) && normalize(flow.name).includes(normalize(search.trim())));
  const serviceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", clientId],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: clientId! } }),
  });
  // Grupos que usam o fluxo de fila como padrão
  const queueGroupsOf = (flowId: string) =>
    (serviceGroupsQuery.data ?? []).filter((group) => group.queueFlowId === flowId).map((group) => group.name);
  const configurations = useWhatsappConfigurations(clientId!);

  // Motivo para não arquivar (o servidor confere de novo, incluindo etapas do funil)
  const archiveBlocker = (flow: Flow) => {
    if (flow.active) return "Desative o fluxo antes de arquivar";
    if (flow.whatsappConfigurationIds.length) return "Tire os números do fluxo antes de arquivar";
    const activeSources = findFlowSources(flows, flow.id).filter((source) => source.active && !source.archivedAt);
    if (activeSources.length) return `Usado por ${activeSources.map((source) => source.name).join(", ")}`;
    if (flow.kind === "QUEUE" && queueGroupsOf(flow.id).length) return `Fila de ${queueGroupsOf(flow.id).join(", ")}`;
    return null;
  };

  const getFlowName = (flowId: string) => flows.find((flow) => flow.id === flowId)?.name ?? "Fluxo removido";
  const getPhoneNumber = (configurationId: string) =>
    configurations.find((configuration) => configuration.id === configurationId)?.phoneNumber ?? "Número removido";

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Fluxos de atendimento</CardTitle>
          <ExpandableDescription summary="Monte o caminho que cada novo atendimento percorre: mensagens, perguntas, agentes de IA e grupos.">
            Cada número de WhatsApp inicia um fluxo; fluxos sem número continuam o atendimento quando outro fluxo os aciona pelo nó "Ir para
            fluxo". Sem fluxo ativo no número, os atendimentos vão direto para a fila do grupo do número.
          </ExpandableDescription>
        </div>
        <DialogCreateFlow clientId={clientId!} />
      </CardHeader>
      <CardContent>
        {flows.length === 0 && (
          <EmptyState title="Nenhum fluxo cadastrado" description="Sem fluxo, os atendimentos vão direto para a fila do grupo do número." />
        )}

        {flows.length > 0 && (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="bg-muted inline-flex w-fit rounded-lg p-0.5" role="tablist" aria-label="Filtrar fluxos">
              {FLOW_FILTERS.map((item) => (
                <button
                  key={item.id}
                  role="tab"
                  aria-selected={filter === item.id}
                  onClick={() => setFilter(item.id)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    filter === item.id ? "bg-background font-medium shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label} ({countOf(item.id)})
                </button>
              ))}
            </div>
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pelo nome" className="pl-8" />
            </div>
          </div>
        )}

        {flows.length > 0 && visibleFlows.length === 0 && (
          <EmptyState
            title={search.trim() ? "Nenhum fluxo com esse nome" : "Nenhum fluxo aqui"}
            description={
              search.trim()
                ? "Confira o nome ou procure nas outras abas."
                : filter === "archived"
                  ? "Fluxos que você arquivar aparecem aqui e podem ser desarquivados."
                  : "Veja as outras abas."
            }
          />
        )}

        {visibleFlows.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {visibleFlows.map((flow) => {
              const blocker = flow.archivedAt ? null : archiveBlocker(flow);
              const targetIds = findFlowTargetIds(flow.definition);
              const sources = findFlowSources(flows, flow.id);

              return (
                <div key={flow.id} className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Workflow className="text-primary h-5 w-5 shrink-0" />
                      <h3 className="truncate text-base font-semibold">{flow.name}</h3>
                      {flow.archivedAt ? (
                        <Badge variant="outline">Arquivado</Badge>
                      ) : (
                        <Badge variant={flow.active ? "default" : "secondary"}>{flow.active ? "Ativo" : "Inativo"}</Badge>
                      )}
                      {flow.kind === "QUEUE" && <Badge variant="outline">Fila</Badge>}
                      {flow.version > 0 && <Badge variant="outline">v{flow.version}</Badge>}
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-8 w-8"
                        aria-label={`Duplicar ${flow.name}`}
                        title="Duplicar"
                        disabled={duplicateFlow.isPending}
                        onClick={() => duplicateFlow.mutate({ params: { clientId: clientId!, flowId: flow.id }, body: {} })}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground h-8 w-8"
                        aria-label={flow.archivedAt ? `Desarquivar ${flow.name}` : `Arquivar ${flow.name}`}
                        title={flow.archivedAt ? "Desarquivar" : (blocker ?? "Arquivar")}
                        disabled={archiveFlow.isPending || !!blocker}
                        onClick={() => archiveFlow.mutate({ flow, archive: !flow.archivedAt })}
                      >
                        {flow.archivedAt ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8" asChild>
                        <Link to={`flow/${flow.id}`} aria-label={`Editar ${flow.name}`} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm">
                    {(flow.draftDefinition ?? flow.definition).nodes.length} nó(s) · reinicia após {flow.resetAfterMinutes} min sem
                    interação
                  </p>
                  {flow.draftDefinition && (
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {flow.version === 0 ? "Nunca publicado" : "Rascunho com alterações não publicadas"}
                    </p>
                  )}

                  <div className="space-y-1 text-sm">
                    {flow.kind === "QUEUE" ? (
                      <p className="text-muted-foreground flex items-start gap-1.5">
                        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>
                          {queueGroupsOf(flow.id).length
                            ? `Fila de ${queueGroupsOf(flow.id).join(", ")}`
                            : "Escolha este fluxo num grupo de atendimento ou no nó Grupo"}
                        </span>
                      </p>
                    ) : (
                      <p className="flex items-start gap-1.5">
                        <Phone className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {flow.whatsappConfigurationIds.length ? (
                          <span>Inicia em {flow.whatsappConfigurationIds.map(getPhoneNumber).join(", ")}</span>
                        ) : (
                          <span className="text-muted-foreground">Sem número · só é acionado por outro fluxo</span>
                        )}
                      </p>
                    )}
                    {sources.length > 0 && (
                      <p className="flex items-start gap-1.5">
                        <CornerDownRight className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Acionado por {sources.map((source) => source.name).join(", ")}</span>
                      </p>
                    )}
                    {targetIds.length > 0 && (
                      <p className="flex items-start gap-1.5">
                        <ArrowRight className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>Leva para {targetIds.map(getFlowName).join(", ")}</span>
                      </p>
                    )}
                  </div>

                  {flow.issues.length > 0 && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {flow.issues.length} pendência(s) para publicar
                    </p>
                  )}

                  <div className="text-muted-foreground mt-auto border-t pt-2 text-xs">
                    Atualizado em {format(new Date(flow.updatedAt), "dd/MM/yyyy HH:mm")}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
