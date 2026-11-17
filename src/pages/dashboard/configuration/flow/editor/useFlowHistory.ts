import type { Edge } from "@xyflow/react";
import { useCallback, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { FlowCanvasNodeType } from "./flowCanvasNode";

export type FlowSnapshot = { nodes: FlowCanvasNodeType[]; edges: Edge[] };

// Limite de passos guardados, para não pesar a memória em sessões longas
const HISTORY_LIMIT = 50;
// Digitação no painel do nó vira um passo só enquanto o usuário não pausa
const COALESCE_MS = 1000;

type UseFlowHistoryParams = {
  nodes: FlowCanvasNodeType[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<FlowCanvasNodeType[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  // Chamado depois de desfazer ou refazer, para marcar o fluxo como não salvo
  onRestore: () => void;
};

/** Desfazer/refazer do editor: guarda fotos de nós e conexões antes de cada mudança. */
export function useFlowHistory({ nodes, edges, setNodes, setEdges, onRestore }: UseFlowHistoryParams) {
  const pastRef = useRef<FlowSnapshot[]>([]);
  const futureRef = useRef<FlowSnapshot[]>([]);
  const lastRecordRef = useRef<{ key: string; at: number } | null>(null);
  const [counts, setCounts] = useState({ past: 0, future: 0 });

  // As funções leem o estado atual pelo ref, para poderem ser chamadas de qualquer handler
  const currentRef = useRef<FlowSnapshot>({ nodes, edges });
  useLayoutEffect(() => {
    currentRef.current = { nodes, edges };
  }, [nodes, edges]);

  const syncCounts = () => setCounts({ past: pastRef.current.length, future: futureRef.current.length });

  const takeSnapshot = useCallback((): FlowSnapshot => currentRef.current, []);

  /**
   * Guarda o estado de agora (ou o snapshot recebido) antes de uma mudança.
   * Com `key`, chamadas seguidas com a mesma chave em menos de 1s viram um passo só.
   */
  const record = useCallback((options?: { key?: string; snapshot?: FlowSnapshot }) => {
    const now = Date.now();
    const last = lastRecordRef.current;
    if (options?.key && last?.key === options.key && now - last.at < COALESCE_MS) {
      lastRecordRef.current = { key: options.key, at: now };
      return;
    }
    lastRecordRef.current = options?.key ? { key: options.key, at: now } : null;

    pastRef.current = [...pastRef.current, options?.snapshot ?? currentRef.current].slice(-HISTORY_LIMIT);
    futureRef.current = [];
    syncCounts();
  }, []);

  // A seleção não faz parte do histórico: voltar não deve reabrir nós antigos
  const restore = useCallback(
    (snapshot: FlowSnapshot) => {
      setNodes(snapshot.nodes.map((node) => ({ ...node, selected: false, dragging: false })));
      setEdges(snapshot.edges.map((edge) => ({ ...edge, selected: false })));
      lastRecordRef.current = null;
      onRestore();
    },
    [setNodes, setEdges, onRestore],
  );

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, currentRef.current];
    restore(previous);
    syncCounts();
  }, [restore]);

  const redo = useCallback(() => {
    const next = futureRef.current.at(-1);
    if (!next) return;
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, currentRef.current];
    restore(next);
    syncCounts();
  }, [restore]);

  // Ao trocar o conteúdo do editor (descartar, restaurar versão, recarregar) o histórico antigo não vale mais
  const reset = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastRecordRef.current = null;
    syncCounts();
  }, []);

  return { record, undo, redo, reset, takeSnapshot, canUndo: counts.past > 0, canRedo: counts.future > 0 };
}
