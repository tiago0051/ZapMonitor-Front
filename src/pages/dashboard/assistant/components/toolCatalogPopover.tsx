import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import type { FC } from "react";
import { areaLabel, toolKindLabel } from "../assistantUtils";
import { useAssistantTools } from "../useAssistantTools";

/** O que o assistente consegue fazer para quem está logado, agrupado por área. */
export const ToolCatalogPopover: FC = () => {
  const toolsQuery = useAssistantTools();

  const groups = new Map<string, AssistantTool[]>();
  for (const tool of toolsQuery.data ?? []) groups.set(tool.area, [...(groups.get(tool.area) ?? []), tool]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <HelpCircle className="h-4 w-4" />O que posso pedir
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-1rem))] p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">O que posso pedir</p>
          <p className="text-muted-foreground text-xs">
            Conforme as suas permissões. Consultas rodam na hora; mudanças viram um plano para aprovar antes de rodar.
          </p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3">
          {toolsQuery.isLoading && <LoadingState className="py-4" />}
          {toolsQuery.isError && <ErrorState message="Não foi possível carregar a lista." onRetry={() => toolsQuery.refetch()} />}
          {toolsQuery.isSuccess && groups.size === 0 && (
            <p className="text-muted-foreground text-sm">Nada disponível com as suas permissões.</p>
          )}
          <div className="grid gap-4">
            {[...groups.entries()].map(([area, tools]) => (
              <section key={area} className="grid gap-1.5">
                <h4 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{areaLabel[area] ?? area}</h4>
                <ul className="grid gap-1.5">
                  {tools.map((tool) => (
                    <li key={tool.name} className="text-sm">
                      {tool.description}
                      <span className="text-muted-foreground"> · {toolKindLabel[tool.kind]}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
