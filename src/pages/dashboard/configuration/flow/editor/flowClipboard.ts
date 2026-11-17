import type { FlowCanvasNodeType } from "./flowCanvasNode";
import { createFlowId } from "./flowNodeConfig";

// Distância de cada cópia em relação à anterior, para as cópias não ficarem uma em cima da outra
const PASTE_OFFSET = 40;

type ClipboardNode = Pick<FlowCanvasNodeType, "type" | "position" | "data">;

// Fica fora do componente para dar para copiar num fluxo e colar em outro sem sair da tela
let clipboard: { nodes: ClipboardNode[]; pasteCount: number } | null = null;

/** Só o Início é único no fluxo; nós que não existem na paleta deste tipo de fluxo também ficam de fora. */
export const canCopyFlowNode = (node: FlowCanvasNodeType, allowedTypes: FlowNodeType[]) =>
  node.type !== "start" && allowedTypes.includes(node.type as FlowNodeType);

export function copyFlowNodes(nodes: FlowCanvasNodeType[]) {
  clipboard = {
    nodes: nodes.map((node) => ({ type: node.type, position: node.position, data: structuredClone(node.data) })),
    pasteCount: 0,
  };
}

export const hasCopiedFlowNodes = () => !!clipboard && clipboard.nodes.length > 0;

// As saídas ganham ids novos: são os pontos de conexão, e a cópia não deve herdar nada do original
const withNewOutputIds = (data: FlowNodeData): FlowNodeData => ({
  ...data,
  ...(data.outputs ? { outputs: data.outputs.map((output) => ({ ...output, id: createFlowId() })) } : {}),
  ...(data.options ? { options: data.options.map((option) => ({ ...option, id: createFlowId() })) } : {}),
});

/** Cria cópias com ids novos, deslocadas e sem conexões. */
export function cloneFlowNodes(source: ClipboardNode[], offsetSteps: number): FlowCanvasNodeType[] {
  return source.map((node) => ({
    id: createFlowId(),
    type: node.type,
    position: { x: node.position.x + PASTE_OFFSET * offsetSteps, y: node.position.y + PASTE_OFFSET * offsetSteps },
    data: withNewOutputIds(structuredClone(node.data)),
    deletable: true,
    selected: true,
  }));
}

/** Cola o que foi copiado; cada colagem seguida desce um pouco mais. */
export function pasteFlowNodes(allowedTypes: FlowNodeType[]): FlowCanvasNodeType[] {
  if (!clipboard) return [];
  clipboard.pasteCount += 1;
  const allowed = clipboard.nodes.filter((node) => node.type !== "start" && allowedTypes.includes(node.type as FlowNodeType));
  return cloneFlowNodes(allowed, clipboard.pasteCount);
}
