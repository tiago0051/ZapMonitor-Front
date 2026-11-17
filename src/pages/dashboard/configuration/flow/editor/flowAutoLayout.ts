import type { Edge } from "@xyflow/react";
import type { FlowCanvasNodeType } from "./flowCanvasNode";
import { FLOW_ENTRY_NODE_TYPES, getFlowNodeOutputs } from "./flowNodeConfig";

// Medidas usadas quando o nó ainda não foi medido pelo canvas (w-60 = 240px)
const NODE_WIDTH = 240;
const FALLBACK_NODE_HEIGHT = 120;
const COLUMN_GAP = 100;
const ROW_GAP = 40;

/**
 * Organiza o fluxo em colunas da esquerda para a direita: cada coluna é a distância a partir do Início
 * (ou dos pontos de entrada no fluxo de fila). Nós soltos, sem caminho até eles, vão para a última coluna.
 * Sem biblioteca de layout: uma busca em largura basta para fluxos deste tamanho.
 */
export function layoutFlowNodes(nodes: FlowCanvasNodeType[], edges: Edge[]): FlowCanvasNodeType[] {
  if (nodes.length === 0) return nodes;

  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  // Saídas na ordem em que aparecem no nó, para os filhos ficarem empilhados na mesma ordem
  const outgoing = new Map<string, string[]>();
  for (const node of nodes) {
    const outputOrder = getFlowNodeOutputs(node.type as FlowNodeType, node.data).map((output) => output.id);
    const targets = edges
      .filter((edge) => edge.source === node.id && nodesById.has(edge.target))
      .sort((a, b) => outputOrder.indexOf(a.sourceHandle ?? "") - outputOrder.indexOf(b.sourceHandle ?? ""))
      .map((edge) => edge.target);
    outgoing.set(node.id, targets);
  }

  const roots = nodes
    .filter((node) => FLOW_ENTRY_NODE_TYPES.includes(node.type as FlowNodeType))
    .sort((a, b) => a.position.y - b.position.y);

  const depthById = new Map<string, number>();
  const order: string[] = [];
  const queue: string[] = [];
  for (const root of roots) {
    depthById.set(root.id, 0);
    order.push(root.id);
    queue.push(root.id);
  }
  while (queue.length > 0) {
    const id = queue.shift()!;
    const depth = depthById.get(id)!;
    for (const target of outgoing.get(id) ?? []) {
      if (depthById.has(target)) continue;
      depthById.set(target, depth + 1);
      order.push(target);
      queue.push(target);
    }
  }

  const columns: string[][] = [];
  for (const id of order) {
    const depth = depthById.get(id)!;
    (columns[depth] ??= []).push(id);
  }

  // Nós sem caminho a partir da entrada ficam juntos no fim, para chamar atenção
  const unreachable = nodes
    .filter((node) => !depthById.has(node.id))
    .sort((a, b) => a.position.y - b.position.y)
    .map((node) => node.id);
  if (unreachable.length > 0) columns.push(unreachable);

  const positions = new Map<string, { x: number; y: number }>();
  columns.forEach((column, columnIndex) => {
    const heights = column.map((id) => nodesById.get(id)?.measured?.height ?? FALLBACK_NODE_HEIGHT);
    const totalHeight = heights.reduce((sum, height) => sum + height, 0) + ROW_GAP * (column.length - 1);
    // Coluna centralizada na altura do Início
    let y = -totalHeight / 2;
    column.forEach((id, rowIndex) => {
      positions.set(id, { x: columnIndex * (NODE_WIDTH + COLUMN_GAP), y });
      y += heights[rowIndex] + ROW_GAP;
    });
  });

  return nodes.map((node) => ({ ...node, position: positions.get(node.id) ?? node.position }));
}
