type FlowDiff = {
  added: FlowDefinitionNode[];
  removed: FlowDefinitionNode[];
  changed: FlowDefinitionNode[];
  // Conexões criadas ou removidas
  edgeChanges: number;
};

// Chaves em ordem fixa, para dados iguais com outra ordem não contarem como alteração
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([first], [second]) => first.localeCompare(second)))
      : item,
  );

/** O que muda ao publicar: nós novos, removidos e alterados (posição não conta) e conexões. */
export function diffFlowDefinitions(published: FlowDefinition, draft: FlowDefinition): FlowDiff {
  const publishedNodes = new Map(published.nodes.map((node) => [node.id, node]));
  const draftNodeIds = new Set(draft.nodes.map((node) => node.id));
  const edgeKey = (edge: FlowDefinitionEdge) => `${edge.source}:${edge.sourceHandle}>${edge.target}`;
  const publishedEdges = new Set(published.edges.map(edgeKey));
  const draftEdges = new Set(draft.edges.map(edgeKey));

  return {
    added: draft.nodes.filter((node) => !publishedNodes.has(node.id)),
    removed: published.nodes.filter((node) => !draftNodeIds.has(node.id)),
    changed: draft.nodes.filter((node) => {
      const before = publishedNodes.get(node.id);
      return before && (before.type !== node.type || stableStringify(before.data) !== stableStringify(node.data));
    }),
    edgeChanges:
      [...draftEdges].filter((key) => !publishedEdges.has(key)).length + [...publishedEdges].filter((key) => !draftEdges.has(key)).length,
  };
}
