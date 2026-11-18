import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { Loader2, Zap } from "lucide-react";
import { Link } from "react-router";

type PanelProps = {
  listRef: React.RefObject<HTMLUListElement | null>;
  results: QuickReply[];
  activeIndex: number;
  isLoading: boolean;
  isError: boolean;
  hasAny: boolean;
  onHover: (index: number) => void;
  onSelect: (reply: QuickReply) => void;
};

export const QuickReplyPanel = ({ listRef, results, activeIndex, isLoading, isError, hasAny, onHover, onSelect }: PanelProps) => {
  const baseUrl = useBaseUrl();

  return (
    <div className="bg-popover text-popover-foreground rounded-lg border shadow-md" role="dialog" aria-label="Respostas rápidas">
      <div className="text-muted-foreground flex items-center justify-between gap-2 border-b px-3 py-1.5 text-xs">
        <span className="flex items-center gap-1 font-medium">
          <Zap className="h-3.5 w-3.5" />
          Respostas rápidas
        </span>
        <span className="hidden sm:inline">↑↓ para escolher · Enter para usar · Esc para fechar</span>
      </div>
      {isLoading && (
        <p className="text-muted-foreground flex items-center gap-2 px-3 py-3 text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando...
        </p>
      )}
      {isError && <p className="text-destructive px-3 py-3 text-sm">Não foi possível carregar as respostas rápidas.</p>}
      {!isLoading && !isError && results.length === 0 && (
        <p className="text-muted-foreground px-3 py-3 text-sm">
          {hasAny ? "Nenhuma resposta com esse atalho." : "Você ainda não tem respostas rápidas."}{" "}
          <Link to={`${baseUrl}/configuration?tab=quickReplies`} className="text-primary font-medium hover:underline">
            Cadastrar
          </Link>
        </p>
      )}
      {results.length > 0 && (
        <ul ref={listRef} role="listbox" className="max-h-60 overflow-y-auto py-1">
          {results.map((reply, index) => (
            <li
              key={reply.id}
              role="option"
              data-index={index}
              aria-selected={index === activeIndex}
              onMouseEnter={() => onHover(index)}
              // mousedown para não tirar o foco da caixa de mensagem
              onMouseDown={(event) => {
                event.preventDefault();
                onSelect(reply);
              }}
              className={cn("cursor-pointer px-3 py-2", index === activeIndex && "bg-muted")}
            >
              <p className="flex items-center gap-2 text-sm">
                <span className="font-mono text-xs font-semibold">/{reply.shortcut}</span>
                <span className="min-w-0 truncate">{reply.title}</span>
                {!reply.shared && <span className="text-muted-foreground ml-auto shrink-0 text-[10px]">pessoal</span>}
              </p>
              <p className="text-muted-foreground truncate text-xs">{reply.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
