import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aiAgentService } from "@/services/api/aiAgentService";
import { crmService } from "@/services/api/crmService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { flowService } from "@/services/api/flowService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { isAxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addEdge,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Loader2, MessageSquareText, Phone, Rocket, Save, Undo2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWhatsappConfigurations } from "../flowLinks";
import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { FlowCanvasNode, type FlowCanvasNodeType } from "./flowCanvasNode";
import { FlowEditorContext, FlowIssuesContext, useFlowEditorContext } from "./flowEditorContext";
import { FlowIssuesPanel } from "./flowIssuesPanel";
import { createFlowId, flowNodeConfigs, getFlowNodeOutputs } from "./flowNodeConfig";
import { FlowNodePanel } from "./flowNodePanel";
import { DiscardDraftDialog, FlowVersionHistory, PublishFlowDialog } from "./flowPublishing";
import { FlowSimulator } from "./flowSimulator";
import { FlowTestContacts } from "./flowTesting";

const nodeTypes = Object.fromEntries(Object.keys(flowNodeConfigs).map((type) => [type, FlowCanvasNode]));
// Fluxo de fila: pontos de entrada e só nós que não tiram o contato da fila
const queuePaletteNodeTypes: FlowNodeType[] = [
  "queueTimer",
  "queueMessage",
  "message",
  "businessHours",
  "category",
  "removeCategory",
  "replaceCategories",
  "crm",
  "crmAnalysis",
  "aiAgent",
  "end",
];
const paletteNodeTypes: FlowNodeType[] = [
  "message",
  "condition",
  "aiAgent",
  "serviceGroup",
  "businessHours",
  "category",
  "removeCategory",
  "replaceCategories",
  "crm",
  "crmAnalysis",
  "flow",
  "end",
];

const toCanvasNodes = (definition: FlowDefinition): FlowCanvasNodeType[] =>
  definition.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
    deletable: node.type !== "start",
  }));

const toCanvasEdges = (definition: FlowDefinition): Edge[] =>
  definition.edges.map((edge) => ({ id: edge.id, source: edge.source, sourceHandle: edge.sourceHandle, target: edge.target }));

const toDefinition = (nodes: FlowCanvasNodeType[], edges: Edge[]): FlowDefinition => ({
  nodes: nodes.map((node) => ({ id: node.id, type: node.type as FlowNodeType, position: node.position, data: node.data })),
  edges: edges.map((edge) => ({ id: edge.id, source: edge.source, sourceHandle: edge.sourceHandle ?? "", target: edge.target })),
});

// Pendências que o back devolve quando recusa salvar ou ativar o fluxo
type RejectedIssues = {
  title: string;
  issues: FlowIssue[];
};

const getRejectedIssues = (error: unknown): RejectedIssues | null => {
  const data = isAxiosError(error) ? error.response?.data : undefined;
  if (!Array.isArray(data?.issues)) return null;

  return { title: data.message, issues: data.issues };
};

type FlowEditorCanvasProps = {
  clientId: string;
  flow: Flow;
};

// O editor mostra o rascunho; sem rascunho, a versão publicada
const editingDefinition = (flow: Flow) => flow.draftDefinition ?? flow.definition;

const isConflict = (error: unknown) => isAxiosError(error) && error.response?.status === 409;

const FlowEditorCanvas: FC<FlowEditorCanvasProps> = ({ clientId, flow }) => {
  const queryClient = useQueryClient();
  const { screenToFlowPosition, fitView } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowCanvasNodeType>(toCanvasNodes(editingDefinition(flow)));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toCanvasEdges(editingDefinition(flow)));
  const [name, setName] = useState(flow.name);
  const [resetAfterMinutes, setResetAfterMinutes] = useState(flow.resetAfterMinutes);
  const [whatsappConfigurationIds, setWhatsappConfigurationIds] = useState(flow.whatsappConfigurationIds);
  const configurations = useWhatsappConfigurations(clientId);
  const { flows } = useFlowEditorContext();
  const { access } = useClientContext();
  // Os nós do CRM só aparecem quando o plano inclui o módulo
  const isQueueFlow = flow.kind === "QUEUE";
  const availableNodeTypes = (isQueueFlow ? queuePaletteNodeTypes : paletteNodeTypes).filter(
    (type) => (type !== "crm" && type !== "crmAnalysis") || access.crmEnabled,
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [rejectedIssues, setRejectedIssues] = useState<RejectedIssues | null>(null);
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);
  const [isPublishOpen, setIsPublishOpen] = useState(false);
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);

  // O nó em que a simulação está fica selecionado no canvas
  const highlightSimulationNode = useCallback(
    (nodeId: string | null) => {
      setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: !!nodeId && node.id === nodeId })));
      if (nodeId) fitView({ nodes: [{ id: nodeId }], duration: 300, maxZoom: 1 });
    },
    [setNodes, fitView],
  );

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const onFlowSaved = (savedFlow: Flow) => {
    queryClient.setQueryData(["flow", clientId, flow.id], savedFlow);
    queryClient.invalidateQueries({ queryKey: ["flows", clientId] });
  };

  // Troca o que está no canvas pelo fluxo recebido (descartar, restaurar ou recarregar depois de conflito)
  const loadFlow = (loadedFlow: Flow) => {
    setNodes(toCanvasNodes(editingDefinition(loadedFlow)));
    setEdges(toCanvasEdges(editingDefinition(loadedFlow)));
    setName(loadedFlow.name);
    setResetAfterMinutes(loadedFlow.resetAfterMinutes);
    setWhatsappConfigurationIds(loadedFlow.whatsappConfigurationIds);
    setSelectedNodeId(null);
    setRejectedIssues(null);
    setIsDirty(false);
    onFlowSaved(loadedFlow);
  };

  const reloadFlow = async () => {
    const latestFlow = await flowService.findById({ params: { clientId, flowId: flow.id } });
    loadFlow(latestFlow);
    toast.success("Fluxo recarregado com a versão mais recente");
  };

  const handleIssuesError = (title: string) => (error: unknown) => {
    if (isConflict(error))
      return toast.error("Outra pessoa salvou este fluxo depois que você abriu", {
        description: "Recarregue para ver a versão atual. As suas alterações não salvas serão perdidas.",
        action: { label: "Recarregar", onClick: () => void reloadFlow() },
        duration: 15000,
      });

    const rejected = getRejectedIssues(error);
    if (!rejected) return requestErrorHandling(error);

    setRejectedIssues(rejected);
    setIsIssuesOpen(true);
    toast.error(title, { description: `Corrija as ${rejected.issues.length} pendência(s) listadas sobre o fluxo.` });
  };

  const updateFlow = useMutation({
    mutationFn: flowService.update,
    onError: handleIssuesError("Fluxo não salvo"),
    onSuccess: (savedFlow) => {
      onFlowSaved(savedFlow);
      setIsDirty(false);
      setRejectedIssues(null);
      toast.success(savedFlow.draftDefinition ? "Rascunho salvo. Publique para colocar as alterações no ar." : "Fluxo salvo");
    },
  });

  const publishFlow = useMutation({
    mutationFn: flowService.publish,
    onError: (error) => {
      setIsPublishOpen(false);
      handleIssuesError("Fluxo não publicado")(error);
    },
    onSuccess: (publishedFlow) => {
      onFlowSaved(publishedFlow);
      setIsPublishOpen(false);
      setRejectedIssues(null);
      toast.success(
        publishedFlow.active
          ? `Versão ${publishedFlow.version} publicada. Novos atendimentos já usam esta versão.`
          : `Versão ${publishedFlow.version} publicada. Ative o fluxo para ela começar a atender.`,
      );
    },
  });

  const discardDraft = useMutation({
    mutationFn: flowService.discardDraft,
    onError: requestErrorHandling,
    onSuccess: (savedFlow) => {
      loadFlow(savedFlow);
      setIsDiscardOpen(false);
      toast.success(`Rascunho descartado. O editor voltou para a versão ${savedFlow.version}.`);
    },
  });

  const restoreVersion = useMutation({
    mutationFn: flowService.restoreVersion,
    onError: requestErrorHandling,
    onSuccess: (savedFlow, { params }) => {
      loadFlow(savedFlow);
      const restored = queryClient
        .getQueryData<FlowVersion[]>(["flowVersions", clientId, flow.id, flow.version])
        ?.find((version) => version.id === params.versionId);
      toast.success(`Versão ${restored?.version ?? ""} copiada para o rascunho. Publique para colocá-la no ar.`);
    },
  });

  const toggleFlow = useMutation({
    mutationFn: flow.active ? flowService.deactivate : flowService.activate,
    onError: handleIssuesError("Fluxo não ativado"),
    onSuccess: (savedFlow) => {
      onFlowSaved(savedFlow);
      toast.success(savedFlow.active ? "Fluxo ativado. Novos atendimentos passam por ele." : "Fluxo desativado");
    },
  });

  const handleSave = () => {
    updateFlow.mutate({
      params: { clientId, flowId: flow.id },
      body: {
        name: name.trim(),
        resetAfterMinutes,
        definition: toDefinition(nodes, edges),
        whatsappConfigurationIds,
        expectedUpdatedAt: flow.updatedAt,
      },
    });
  };

  // Mudanças na estrutura (mover, conectar, remover) marcam o fluxo como não salvo
  const markDirty = () => setIsDirty(true);

  const onConnect = useCallback(
    (connection: Connection) => {
      // Cada saída leva a um único destino: a nova conexão substitui a anterior
      setEdges((currentEdges) =>
        addEdge(
          { ...connection, id: createFlowId() },
          currentEdges.filter((edge) => !(edge.source === connection.source && edge.sourceHandle === connection.sourceHandle)),
        ),
      );
      setIsDirty(true);
    },
    [setEdges],
  );

  const addNode = (type: FlowNodeType) => {
    const id = createFlowId();
    const position = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    setNodes((currentNodes) => [...currentNodes, { id, type, position, data: flowNodeConfigs[type].defaultData(), deletable: true }]);
    setSelectedNodeId(id);
    setIsDirty(true);
  };

  const updateNodeData = (nodeId: string, data: FlowNodeData) => {
    const node = nodes.find((item) => item.id === nodeId);
    if (!node) return;

    // Conexões de saídas que deixaram de existir são removidas
    const outputIds = new Set(getFlowNodeOutputs(node.type as FlowNodeType, data).map((output) => output.id));

    setNodes((currentNodes) => currentNodes.map((item) => (item.id === nodeId ? { ...item, data } : item)));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId || outputIds.has(edge.sourceHandle ?? "")));
    setIsDirty(true);
  };

  const showNode = (nodeId: string) => {
    setNodes((currentNodes) => currentNodes.map((node) => ({ ...node, selected: node.id === nodeId })));
    setSelectedNodeId(nodeId);
    fitView({ nodes: [{ id: nodeId }], duration: 300, maxZoom: 1 });
  };

  const deleteNode = (nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
    setIsDirty(true);
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Um número só inicia um fluxo; mostra onde ele está hoje para deixar claro que será movido
  const findOtherFlowName = (configurationId: string) =>
    flows.find((item) => item.id !== flow.id && item.whatsappConfigurationIds.includes(configurationId))?.name;

  const toggleConfiguration = (configurationId: string, checked: boolean) => {
    setWhatsappConfigurationIds((current) =>
      checked ? [...current, configurationId] : current.filter((item) => item !== configurationId),
    );
    setIsDirty(true);
  };

  // A recusa mais recente mostra o que o usuário tentou publicar ou ativar; sem ela, vale o que está salvo no editor
  const issues = rejectedIssues?.issues ?? flow.issues;
  const issuesTitle = rejectedIssues
    ? `${rejectedIssues.issues.length} pendência(s)`
    : `${flow.issues.length} pendência(s) ${flow.draftDefinition ? "no rascunho salvo" : "na versão publicada"}`;
  const issuesDescription = rejectedIssues
    ? `${rejectedIssues.title}. Clique em um item para ir até o nó.`
    : "Resolva para poder publicar. Clique em um item para ir até o nó.";
  const issueCountByNodeId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const issue of issues) {
      if (issue.nodeId) counts.set(issue.nodeId, (counts.get(issue.nodeId) ?? 0) + 1);
    }
    return counts;
  }, [issues]);

  const isPending =
    updateFlow.isPending || toggleFlow.isPending || publishFlow.isPending || discardDraft.isPending || restoreVersion.isPending;
  const hasDraft = !!flow.draftDefinition;
  const canPublish = hasDraft && !isDirty && flow.issues.length === 0;
  const publishTitle = isDirty
    ? "Salve as alterações antes de publicar"
    : !hasDraft
      ? "Nada para publicar: o editor está igual à versão no ar"
      : flow.issues.length > 0
        ? "Resolva as pendências do rascunho para publicar"
        : undefined;
  const canActivate = !flow.active && flow.version > 0 && flow.publishedIssues.length === 0;
  const activateTitle =
    flow.version === 0
      ? "Publique o fluxo antes de ativar"
      : flow.publishedIssues.length > 0
        ? "A versão publicada tem pendências: corrija, publique e ative"
        : undefined;

  return (
    <div className="flex h-full flex-col">
      <div className="bg-card flex flex-wrap items-end gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="../..?tab=flow" relative="path">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div className="min-w-48 flex-1 space-y-1">
          <Label htmlFor="flow-name">Nome do fluxo</Label>
          <Input
            id="flow-name"
            value={name}
            maxLength={100}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
          />
        </div>

        {!isQueueFlow && (
          <>
            <div className="w-44 space-y-1">
              <Label htmlFor="flow-reset">Reiniciar após (min)</Label>
              <Input
                id="flow-reset"
                type="number"
                min={5}
                max={10080}
                value={resetAfterMinutes}
                title="Minutos sem interação do contato com a IA ou a pergunta do fluxo; depois disso a próxima mensagem recomeça o fluxo"
                onChange={(e) => {
                  setResetAfterMinutes(e.target.valueAsNumber);
                  setIsDirty(true);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label>Números</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-44 justify-start font-normal">
                    <Phone className="h-4 w-4" />
                    {whatsappConfigurationIds.length ? `${whatsappConfigurationIds.length} número(s)` : "Nenhum"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 space-y-2">
                  <p className="text-muted-foreground text-xs">
                    Novos atendimentos destes números começam neste fluxo. Sem número, o fluxo só é acionado pelo nó "Ir para fluxo".
                  </p>
                  {configurations.length === 0 && <p className="text-muted-foreground text-sm">Nenhum número cadastrado.</p>}
                  {configurations.map((configuration) => {
                    const otherFlowName = findOtherFlowName(configuration.id);

                    return (
                      <label key={configuration.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={whatsappConfigurationIds.includes(configuration.id)}
                          onCheckedChange={(checked) => toggleConfiguration(configuration.id, checked === true)}
                        />
                        <span>{configuration.phoneNumber}</span>
                        {otherFlowName && !whatsappConfigurationIds.includes(configuration.id) && (
                          <span className="text-muted-foreground truncate text-xs">(hoje inicia {otherFlowName})</span>
                        )}
                      </label>
                    );
                  })}
                </PopoverContent>
              </Popover>
            </div>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={flow.active ? "default" : "secondary"}>{flow.active ? "Ativo" : "Inativo"}</Badge>
          <Badge variant="outline" title="Cada publicação gera uma versão; atendimentos em andamento continuam na versão em que começaram">
            {flow.version > 0 ? `Versão ${flow.version} no ar` : "Nunca publicado"}
          </Badge>
          {isDirty ? (
            <span className="text-muted-foreground text-xs">Alterações não salvas</span>
          ) : (
            hasDraft &&
            flow.version > 0 && <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Rascunho não publicado</span>
          )}
          <Button
            variant="outline"
            onClick={handleSave}
            disabled={isPending || !name.trim() || !Number.isInteger(resetAfterMinutes)}
            title="Salva o rascunho; os atendimentos continuam na versão publicada"
          >
            {updateFlow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar rascunho
          </Button>
          <Button disabled={isPending || !canPublish} title={publishTitle} onClick={() => setIsPublishOpen(true)}>
            <Rocket className="h-4 w-4" />
            Publicar
          </Button>
          {hasDraft && flow.version > 0 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Descartar rascunho"
              title="Descartar rascunho e voltar para a versão publicada"
              disabled={isPending}
              onClick={() => setIsDiscardOpen(true)}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="outline"
            title="Conversar com o rascunho salvo, sem WhatsApp"
            onClick={() => {
              setSelectedNodeId(null);
              setIsSimulatorOpen(true);
            }}
          >
            <MessageSquareText className="h-4 w-4" />
            Simular
          </Button>
          {!isQueueFlow && <FlowTestContacts clientId={clientId} flow={flow} />}
          <FlowVersionHistory
            clientId={clientId}
            flow={flow}
            disabled={isDirty || isPending}
            restoringVersionId={restoreVersion.isPending ? (restoreVersion.variables?.params.versionId ?? null) : null}
            onRestore={(version) => restoreVersion.mutate({ params: { clientId, flowId: flow.id, versionId: version.id } })}
          />
          <Button
            variant={flow.active ? "outline" : "secondary"}
            disabled={isPending || (!flow.active && !canActivate)}
            title={!flow.active ? activateTitle : undefined}
            onClick={() => toggleFlow.mutate({ params: { clientId, flowId: flow.id } })}
          >
            {flow.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
        <PublishFlowDialog
          flow={flow}
          open={isPublishOpen}
          onOpenChange={setIsPublishOpen}
          isPending={publishFlow.isPending}
          onConfirm={() => publishFlow.mutate({ params: { clientId, flowId: flow.id }, body: { expectedUpdatedAt: flow.updatedAt } })}
        />
        <DiscardDraftDialog
          flow={flow}
          open={isDiscardOpen}
          onOpenChange={setIsDiscardOpen}
          isPending={discardDraft.isPending}
          onConfirm={() => discardDraft.mutate({ params: { clientId, flowId: flow.id } })}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="bg-card w-56 shrink-0 space-y-2 overflow-y-auto border-r p-3">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Adicionar nó</p>
          {availableNodeTypes.map((type) => {
            const config = flowNodeConfigs[type];
            const Icon = config.icon;

            return (
              <button
                key={type}
                onClick={() => addNode(type)}
                className="hover:bg-muted flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors"
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.colorClassName}`} />
                <span>
                  <span className="block text-sm font-medium">{config.label}</span>
                  <span className="text-muted-foreground block text-xs">{config.description}</span>
                </span>
              </button>
            );
          })}
        </aside>

        <div className="relative min-w-0 flex-1">
          {issues.length > 0 && (
            <FlowIssuesPanel
              title={issuesTitle}
              description={issuesDescription}
              issues={issues}
              nodes={nodes}
              isOpen={isIssuesOpen}
              onOpenChange={setIsIssuesOpen}
              onSelectNode={showNode}
            />
          )}
          <FlowIssuesContext.Provider value={issueCountByNodeId}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={(changes) => {
                onNodesChange(changes);
                if (changes.some((change) => change.type === "position" || change.type === "remove")) markDirty();
              }}
              onEdgesChange={(changes) => {
                onEdgesChange(changes);
                if (changes.some((change) => change.type === "remove")) markDirty();
              }}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              defaultEdgeOptions={{ animated: true }}
              colorMode="system"
              fitView
              deleteKeyCode={["Backspace", "Delete"]}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </FlowIssuesContext.Provider>
        </div>

        {isSimulatorOpen && (
          <aside className="bg-card w-96 shrink-0 border-l">
            <FlowSimulator
              clientId={clientId}
              flow={flow}
              isDirty={isDirty}
              onClose={() => setIsSimulatorOpen(false)}
              onCurrentNode={highlightSimulationNode}
            />
          </aside>
        )}

        {selectedNode && !isSimulatorOpen && (
          <aside className="bg-card w-80 shrink-0 border-l">
            <FlowNodePanel
              key={selectedNode.id}
              type={selectedNode.type as FlowNodeType}
              data={selectedNode.data}
              onChange={(data) => updateNodeData(selectedNode.id, data)}
              onDelete={() => deleteNode(selectedNode.id)}
              onClose={() => setSelectedNodeId(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
};

export const FlowEditor = () => {
  const { clientId, flowId } = useParams();

  const flowQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["flow", clientId, flowId],
    queryFn: () => flowService.findById({ params: { clientId: clientId!, flowId: flowId! } }),
  });

  const serviceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", clientId],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: clientId! } }),
  });

  const aiAgentsQuery = useQuery({
    queryKey: ["aiAgents", clientId],
    queryFn: () => aiAgentService.findAll({ params: { clientId: clientId! } }),
  });

  const categoriesQuery = useQuery({
    queryKey: ["flowCategories", clientId],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({ params: { clientId: clientId! }, queries: { text: "", page: 1, take: 1000 } }),
  });

  const flowsQuery = useQuery({
    queryKey: ["flows", clientId],
    queryFn: () => flowService.findAll({ params: { clientId: clientId! } }),
  });

  const { access } = useClientContext();
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", clientId],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: clientId! } }),
    enabled: access.crmEnabled,
  });

  const crmFieldsQuery = useQuery({
    queryKey: ["crm", "fields", clientId],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: clientId! } }),
    enabled: access.crmEnabled,
  });

  const contextValue = useMemo(
    () => ({
      serviceGroups: serviceGroupsQuery.data ?? [],
      aiAgents: aiAgentsQuery.data ?? [],
      categories: categoriesQuery.data?.items ?? [],
      flows: flowsQuery.data ?? [],
      pipelines: (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active),
      crmFields: (crmFieldsQuery.data ?? []).filter((field) => field.active),
      currentFlowId: flowId!,
    }),
    [serviceGroupsQuery.data, aiAgentsQuery.data, categoriesQuery.data, flowsQuery.data, pipelinesQuery.data, crmFieldsQuery.data, flowId],
  );

  if (flowQuery.isLoading) return <LoadingState className="h-full" label="Carregando o fluxo..." />;

  const isFlowNotFound = isAxiosError(flowQuery.error) && flowQuery.error.response?.status === 404;
  if (flowQuery.isError && !flowQuery.data && !isFlowNotFound)
    return (
      <ErrorState
        className="h-full"
        message="Não foi possível abrir o fluxo."
        onRetry={() => flowQuery.refetch()}
        isRetrying={flowQuery.isFetching}
      />
    );

  if (!flowQuery.data) {
    return (
      <EmptyState
        className="m-6"
        title="Fluxo não encontrado"
        description="Ele pode ter sido excluído."
        action={
          <Button variant="outline" asChild>
            <Link to="../..?tab=flow" relative="path">
              Voltar para os fluxos
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <FlowEditorContext.Provider value={contextValue}>
      <ReactFlowProvider>
        {/* A key recria o canvas quando outro fluxo é aberto */}
        <FlowEditorCanvas key={flowQuery.data.id} clientId={clientId!} flow={flowQuery.data} />
      </ReactFlowProvider>
    </FlowEditorContext.Provider>
  );
};
