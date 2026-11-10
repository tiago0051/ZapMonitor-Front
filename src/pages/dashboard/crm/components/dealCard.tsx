import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRightLeft, ListTodo, PhoneOff, Snowflake, Sparkles, Tag, UserRound, Users } from "lucide-react";
import type { FC } from "react";
import { aiScoreLabel, dealContactName, formatCurrency, staleDays } from "../crmUtils";
import { OpenChatButton } from "../chatDock/openChatButton";
import { DealOriginBadge } from "./dealOrigin";

type DealCardProps = {
  deal: Deal;
  stage?: PipelineStage;
  onOpen: (deal: Deal) => void;
  draggable: boolean;
  /** Etapas do funil para o atalho "Mover para…", que substitui o arrastar no toque */
  stages?: PipelineStage[];
  onMove?: (stage: PipelineStage) => void;
};

/** Menu "Mover para…" do card: a mesma ação do arrastar, acessível no celular e pelo teclado. */
const MoveDealMenu: FC<{ deal: Deal; stages: PipelineStage[]; onMove: (stage: PipelineStage) => void }> = ({ deal, stages, onMove }) => (
  // Eventos do menu (mesmo no portal) sobem pela árvore do React; parar aqui evita abrir o negócio
  <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary h-6 w-6"
          aria-label={`Mover ${deal.title} para outra etapa`}
          title="Mover para…"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">Mover para…</DropdownMenuLabel>
        {stages.map((stage) => (
          <DropdownMenuItem key={stage.id} disabled={stage.id === deal.stageId} onSelect={() => onMove(stage)}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
            <span className="truncate">{stage.name}</span>
            {stage.id === deal.stageId && <span className="text-muted-foreground ml-auto text-[11px]">atual</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

export const DEAL_DRAG_TYPE = "application/x-zapmonitor-deal";

export const DealCard: FC<DealCardProps> = ({ deal, stage, onOpen, draggable, stages, onMove }) => {
  const contactName = dealContactName(deal.contact);
  const daysStale = staleDays(deal, stage);
  const isTaskOverdue = !!deal.nextTask && isPast(new Date(deal.nextTask.dueAt));

  return (
    // div no lugar de button: o card leva o atalho da conversa, e botão dentro de botão não é válido
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData(DEAL_DRAG_TYPE, deal.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(deal)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
        event.preventDefault();
        onOpen(deal);
      }}
      className={cn(
        "bg-card hover:border-primary/40 focus-visible:ring-ring/50 w-full space-y-2 rounded-lg border p-3 text-left shadow-xs transition-colors outline-none focus-visible:ring-[3px]",
        draggable && "cursor-grab active:cursor-grabbing",
        daysStale !== null && "border-sky-400 bg-sky-50/60 dark:border-sky-500/70 dark:bg-sky-950/30",
      )}
    >
      {daysStale !== null && (
        <p className="flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
          <Snowflake className="h-3 w-3" />
          Esfriando: {daysStale} {daysStale === 1 ? "dia" : "dias"} sem atividade
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{deal.title}</p>
        <div className="-mt-0.5 -mr-1 flex shrink-0 items-center gap-1">
          {deal.value !== null && <span className="text-xs font-semibold text-green-700">{formatCurrency(deal.value)}</span>}
          {deal.contact && <OpenChatButton contact={deal.contact} variant="icon" />}
          {deal.status === "OPEN" && stages && onMove && <MoveDealMenu deal={deal} stages={stages} onMove={onMove} />}
        </div>
      </div>

      {!deal.contact ? (
        <p className="flex items-center gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
          <PhoneOff className="h-3 w-3" />
          Sem telefone: adicione para conversar
        </p>
      ) : (
        deal.title !== contactName && <p className="text-muted-foreground truncate text-xs">{contactName}</p>
      )}

      {deal.origin && <DealOriginBadge origin={deal.origin} />}

      {deal.aiScore !== null && (
        <p className="text-muted-foreground flex items-center gap-1 text-[11px]" title={deal.aiInsight?.scoreReason}>
          <Sparkles className="text-primary h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium tabular-nums">{deal.aiScore}</span>
          <span>· {aiScoreLabel(deal.aiScore)}</span>
        </p>
      )}

      {!!deal.contact?.categories.length && (
        <div className="flex flex-wrap gap-1">
          {deal.contact.categories.slice(0, 2).map((category) => (
            <span key={category.id} className="bg-muted inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium">
              <Tag className="text-muted-foreground h-2.5 w-2.5" />
              {category.name}
            </span>
          ))}
          {deal.contact.categories.length > 2 && (
            <span className="text-muted-foreground text-[10px]">+{deal.contact.categories.length - 2}</span>
          )}
        </div>
      )}

      <div className="text-muted-foreground flex items-center justify-between gap-2 text-[11px]">
        <span className="flex min-w-0 items-center gap-1">
          <UserRound className="h-3 w-3 shrink-0" />
          <span className="truncate">{deal.owner?.name ?? "Sem responsável"}</span>
        </span>
        <span className="shrink-0" title="Tempo na etapa">
          {formatDistanceToNow(new Date(deal.stageEnteredAt), { locale: ptBR })}
        </span>
      </div>

      {deal.nextTask && (
        <p
          className={cn("flex items-center gap-1 text-[11px]", isTaskOverdue ? "font-medium text-red-600" : "text-muted-foreground")}
          title={deal.nextTask.title}
        >
          <ListTodo className="h-3 w-3 shrink-0" />
          <span className="truncate">
            {isTaskOverdue ? "Atrasada: " : ""}
            {deal.nextTask.title} · {format(new Date(deal.nextTask.dueAt), "dd/MM HH:mm", { locale: ptBR })}
          </span>
          {deal.openTaskCount > 1 && <span className="shrink-0">+{deal.openTaskCount - 1}</span>}
        </p>
      )}

      {deal.serviceGroup && (
        <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{deal.serviceGroup.name}</span>
        </p>
      )}
    </div>
  );
};
