import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search } from "lucide-react";
import { useState, type FC } from "react";
import type { FlowCanvasNodeType } from "./flowCanvasNode";
import { flowNodeConfigs } from "./flowNodeConfig";
import { useNodeSummary } from "./useNodeSummary";

// Busca sem diferenciar maiúsculas e acentos: "intencao" acha "Intenção"
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

type ResultProps = {
  node: FlowCanvasNodeType;
  query: string;
  onSelect: (nodeId: string) => void;
};

// Cada item calcula o próprio resumo (é um hook) e some quando não combina com a busca
const NodeSearchResult: FC<ResultProps> = ({ node, query, onSelect }) => {
  const type = node.type as FlowNodeType;
  const config = flowNodeConfigs[type];
  const summary = useNodeSummary(type, node.data) ?? "";
  if (query && !normalize(`${config.label} ${summary}`).includes(query)) return null;

  const Icon = config.icon;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className="hover:bg-muted focus-visible:bg-muted flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left outline-none"
      >
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.colorClassName}`} />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{config.label}</span>
          <span className="text-muted-foreground line-clamp-2 text-xs">{summary}</span>
        </span>
      </button>
    </li>
  );
};

type FlowNodeSearchProps = {
  nodes: FlowCanvasNodeType[];
  onSelect: (nodeId: string) => void;
  triggerClassName?: string;
};

/** "Buscar nó": acha o nó pelo nome ou pelo texto e leva o canvas até ele. */
export const FlowNodeSearch: FC<FlowNodeSearchProps> = ({ nodes, onSelect, triggerClassName }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalize(query.trim());

  const select = (nodeId: string) => {
    setOpen(false);
    setQuery("");
    onSelect(nodeId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName} aria-label="Buscar nó" title="Buscar nó">
          <Search className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-2 p-2">
        <Input
          autoFocus
          value={query}
          placeholder="Buscar nó pelo nome ou texto"
          aria-label="Buscar nó pelo nome ou texto"
          onChange={(e) => setQuery(e.target.value)}
        />
        {/* "peer-empty" mostra o aviso quando nenhum item combinou com a busca */}
        <ul className="peer max-h-72 space-y-0.5 overflow-y-auto">
          {nodes.map((node) => (
            <NodeSearchResult key={node.id} node={node} query={normalizedQuery} onSelect={select} />
          ))}
        </ul>
        <p className="text-muted-foreground hidden px-2 py-1 text-sm peer-empty:block">Nenhum nó encontrado.</p>
      </PopoverContent>
    </Popover>
  );
};
