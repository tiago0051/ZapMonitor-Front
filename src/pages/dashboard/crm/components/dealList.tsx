import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowDown, ArrowUp, Snowflake } from "lucide-react";
import { useState, type FC } from "react";
import { OpenChatButton } from "../chatDock/openChatButton";
import { dealContactName, dealStatusLabel, findPipelineStage, formatCurrency, staleDays } from "../crmUtils";

type SortKey = "title" | "stage" | "value" | "aiScore" | "lastActivityAt" | "createdAt";

type DealListProps = {
  deals: Deal[];
  pipeline: Pipeline;
  onOpen: (deal: Deal) => void;
};

const compareBy: Record<SortKey, (first: Deal, second: Deal, pipeline: Pipeline) => number> = {
  title: (first, second) => first.title.localeCompare(second.title, "pt-BR"),
  stage: (first, second, pipeline) =>
    (findPipelineStage(pipeline, first.stageId)?.order ?? 0) - (findPipelineStage(pipeline, second.stageId)?.order ?? 0),
  value: (first, second) => (first.value ?? -1) - (second.value ?? -1),
  aiScore: (first, second) => (first.aiScore ?? -1) - (second.aiScore ?? -1),
  lastActivityAt: (first, second) => first.lastActivityAt.localeCompare(second.lastActivityAt),
  createdAt: (first, second) => first.createdAt.localeCompare(second.createdAt),
};

/** Os mesmos negócios do quadro em tabela, para comparar e ordenar muitos de uma vez. */
export const DealList: FC<DealListProps> = ({ deals, pipeline, onOpen }) => {
  const [sortKey, setSortKey] = useState<SortKey>("lastActivityAt");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = [...deals].sort((first, second) => {
    const result = compareBy[sortKey](first, second, pipeline);
    return direction === "asc" ? result : -result;
  });

  const sortBy = (key: SortKey) => {
    if (key === sortKey) setDirection((current) => (current === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDirection(key === "title" || key === "stage" ? "asc" : "desc");
    }
  };

  const sortableHead = (label: string, sort: SortKey, className?: string) => (
    <TableHead className={className} aria-sort={sortKey === sort ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" onClick={() => sortBy(sort)} className="hover:text-foreground inline-flex items-center gap-1">
        {label}
        {sortKey === sort && (direction === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </button>
    </TableHead>
  );

  if (deals.length === 0) return <p className="text-muted-foreground p-6 text-center text-sm">Nenhum negócio com esses filtros.</p>;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {sortableHead("Negócio", "title")}
              {sortableHead("Etapa", "stage")}
              {sortableHead("Valor", "value", "text-right")}
              {sortableHead("Nota IA", "aiScore", "text-right")}
              <TableHead>Responsável</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>Próxima tarefa</TableHead>
              {sortableHead("Última atividade", "lastActivityAt")}
              {sortableHead("Criado em", "createdAt")}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((deal) => {
              const stage = findPipelineStage(pipeline, deal.stageId);
              const daysStale = staleDays(deal, stage);
              const isTaskOverdue = !!deal.nextTask && isPast(new Date(deal.nextTask.dueAt));

              return (
                <TableRow key={deal.id} className="cursor-pointer" onClick={() => onOpen(deal)}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="min-w-0">
                        <p className="font-medium">{deal.title}</p>
                        <p className="text-muted-foreground text-xs">{dealContactName(deal.contact)}</p>
                      </div>
                      {deal.contact && <OpenChatButton contact={deal.contact} variant="icon" className="ml-auto" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage?.color }} />
                      {stage?.name}
                    </span>
                    {deal.status !== "OPEN" && <p className="text-muted-foreground text-xs">{dealStatusLabel[deal.status]}</p>}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums">
                    {deal.value === null ? "—" : formatCurrency(deal.value)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap tabular-nums" title={deal.aiInsight?.scoreReason}>
                    {deal.aiScore ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{deal.owner?.name ?? "—"}</TableCell>
                  <TableCell className="whitespace-nowrap">{deal.serviceGroup?.name ?? "—"}</TableCell>
                  <TableCell className={cn("text-xs", isTaskOverdue && "font-medium text-red-600")}>
                    {deal.nextTask
                      ? `${deal.nextTask.title} · ${format(new Date(deal.nextTask.dueAt), "dd/MM HH:mm", { locale: ptBR })}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDistanceToNow(new Date(deal.lastActivityAt), { locale: ptBR, addSuffix: true })}
                    {daysStale !== null && (
                      <span className="ml-1 inline-flex items-center gap-0.5 text-sky-700 dark:text-sky-300">
                        <Snowflake className="h-3 w-3" />
                        esfriando
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap tabular-nums">{format(new Date(deal.createdAt), "dd/MM/yyyy")}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
