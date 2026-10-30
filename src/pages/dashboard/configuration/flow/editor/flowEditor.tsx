import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { aiAgentService } from "@/services/api/aiAgentService";
import { flowService } from "@/services/api/flowService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { requestErrorHandling } from "@/utils/request";
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
import { AlertTriangle, ArrowLeft, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FC } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { FlowCanvasNode, type FlowCanvasNodeType } from "./flowCanvasNode";
import { FlowEditorContext } from "./flowEditorContext";
import { createFlowId, flowNodeConfigs, getFlowNodeOutputs } from "./flowNodeConfig";
import { FlowNodePanel } from "./flowNodePanel";

const nodeTypes = Object.fromEntries(Object.keys(flowNodeConfigs).map((type) => [type, FlowCanvasNode]));
const paletteNodeTypes: FlowNodeType[] = ["message", "condition", "aiAgent", "serviceGroup", "businessHours", "end"];

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

type FlowEditorCanvasProps = {
  clientId: string;
  flow: Flow;
};

const FlowEditorCanvas: FC<FlowEditorCanvasProps> = ({ clientId, flow }) => {
  const queryClient = useQueryClient();
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowCanvasNodeType>(toCanvasNodes(flow.definition));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toCanvasEdges(flow.definition));
  const [name, setName] = useState(flow.name);
  const [resetAfterMinutes, setResetAfterMinutes] = useState(flow.resetAfterMinutes);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const onFlowSaved = (savedFlow: Flow) => {
    queryClient.setQueryData(["flow", clientId, flow.id], savedFlow);
    queryClient.invalidateQueries({ queryKey: ["flows", clientId] });
  };

  const updateFlow = useMutation({
    mutationFn: flowService.update,
    onError: requestErrorHandling,
    onSuccess: (savedFlow) => {
      onFlowSaved(savedFlow);
      setIsDirty(false);
      toast.success("Fluxo salvo");
    },
  });

  const toggleFlow = useMutation({
    mutationFn: flow.active ? flowService.deactivate : flowService.activate,
    onError: requestErrorHandling,
    onSuccess: (savedFlow) => {
      onFlowSaved(savedFlow);
      toast.success(savedFlow.active ? "Fluxo ativado. Novos atendimentos passam por ele." : "Fluxo desativado");
    },
  });

  const handleSave = () => {
    updateFlow.mutate({
      params: { clientId, flowId: flow.id },
      body: { name: name.trim(), resetAfterMinutes, definition: toDefinition(nodes, edges) },
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

  const isPending = updateFlow.isPending || toggleFlow.isPending;
  const canActivate = !flow.active && flow.issues.length === 0 && !isDirty;

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

        <div className="flex items-center gap-2">
          <Badge variant={flow.active ? "default" : "secondary"}>{flow.active ? "Ativo" : "Inativo"}</Badge>
          {isDirty && <span className="text-muted-foreground text-xs">Alterações não salvas</span>}
          <Button onClick={handleSave} disabled={isPending || !name.trim() || !Number.isInteger(resetAfterMinutes)}>
            {updateFlow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar
          </Button>
          <Button
            variant={flow.active ? "outline" : "secondary"}
            disabled={isPending || (!flow.active && !canActivate)}
            title={!flow.active && !canActivate ? "Salve o fluxo e resolva as pendências para ativar" : undefined}
            onClick={() => toggleFlow.mutate({ params: { clientId, flowId: flow.id } })}
          >
            {flow.active ? "Desativar" : "Ativar"}
          </Button>
        </div>
      </div>

      {flow.issues.length > 0 && (
        <details className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <summary className="flex cursor-pointer items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            {flow.issues.length} pendência(s) na última versão salva. Resolva para ativar o fluxo.
          </summary>
          <ul className="mt-2 list-disc space-y-0.5 pl-6">
            {flow.issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex min-h-0 flex-1">
        <aside className="bg-card w-56 shrink-0 space-y-2 overflow-y-auto border-r p-3">
          <p className="text-muted-foreground text-xs font-semibold uppercase">Adicionar nó</p>
          {paletteNodeTypes.map((type) => {
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

        <div className="min-w-0 flex-1">
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
        </div>

        {selectedNode && (
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

  const contextValue = useMemo(
    () => ({ serviceGroups: serviceGroupsQuery.data ?? [], aiAgents: aiAgentsQuery.data ?? [] }),
    [serviceGroupsQuery.data, aiAgentsQuery.data],
  );

  if (flowQuery.isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!flowQuery.data) return <p className="text-muted-foreground p-6 text-sm">Fluxo não encontrado.</p>;

  return (
    <FlowEditorContext.Provider value={contextValue}>
      <ReactFlowProvider>
        {/* A key recria o canvas quando outro fluxo é aberto */}
        <FlowEditorCanvas key={flowQuery.data.id} clientId={clientId!} flow={flowQuery.data} />
      </ReactFlowProvider>
    </FlowEditorContext.Provider>
  );
};
