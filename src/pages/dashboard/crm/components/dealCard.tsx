import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tag, UserRound, Users } from "lucide-react";
import type { FC } from "react";
import { dealContactName, formatCurrency } from "../crmUtils";

type DealCardProps = {
  deal: Deal;
  onOpen: (deal: Deal) => void;
  draggable: boolean;
};

export const DEAL_DRAG_TYPE = "application/x-zapmonitor-deal";

export const DealCard: FC<DealCardProps> = ({ deal, onOpen, draggable }) => {
  const contactName = dealContactName(deal.contact);

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(event) => {
        event.dataTransfer.setData(DEAL_DRAG_TYPE, deal.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      onClick={() => onOpen(deal)}
      className={cn(
        "bg-card hover:border-primary/40 w-full space-y-2 rounded-lg border p-3 text-left shadow-xs transition-colors",
        draggable && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium">{deal.title}</p>
        {deal.value !== null && <span className="shrink-0 text-xs font-semibold text-green-700">{formatCurrency(deal.value)}</span>}
      </div>

      {deal.title !== contactName && <p className="text-muted-foreground truncate text-xs">{contactName}</p>}

      {deal.contact.categories.length > 0 && (
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

      {deal.serviceGroup && (
        <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
          <Users className="h-3 w-3 shrink-0" />
          <span className="truncate">{deal.serviceGroup.name}</span>
        </p>
      )}
    </button>
  );
};
