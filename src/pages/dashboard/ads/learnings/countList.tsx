import { cn } from "@/lib/utils";
import type { FC } from "react";

type CountListProps = {
  title: string;
  items: AdLearningCountItem[];
  emptyText: string;
  barClassName?: string;
  /** Quantos itens mostrar; o resto fica de fora */
  limit?: number;
};

/** Ranking com a contagem e uma barra proporcional ao item mais frequente. */
export const CountList: FC<CountListProps> = ({ title, items, emptyText, barClassName = "bg-primary", limit = 6 }) => {
  const visible = [...items].sort((a, b) => b.count - a.count).slice(0, limit);
  const max = visible[0]?.count ?? 0;
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <h4 className="text-sm font-semibold">{title}</h4>
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <li key={item.value} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{item.label}</span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {item.count} {total > 0 && `· ${Math.round((item.count / total) * 100)}%`}
                </span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
                <span
                  className={cn("block h-full rounded-full", barClassName)}
                  style={{ width: `${max ? (item.count / max) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
