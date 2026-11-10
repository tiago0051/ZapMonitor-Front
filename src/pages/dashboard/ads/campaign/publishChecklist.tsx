import { cn } from "@/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";
import type { FC } from "react";
import type { ChecklistItem } from "./publishChecklistUtils";

export const PublishChecklist: FC<{ items: ChecklistItem[] }> = ({ items }) => (
  <ul className="space-y-1.5" aria-label="Pronto para criar">
    {items.map((item) => (
      <li key={item.label} className="text-sm">
        <span className={cn("flex items-start gap-2", item.ok ? "text-muted-foreground" : "font-medium")}>
          {item.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-label="Pronto" />
          ) : (
            <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-label="Falta" />
          )}
          {item.label}
        </span>
        {item.details.length > 0 && (
          <ul className="mt-0.5 list-disc space-y-0.5 pl-11 text-xs text-amber-700 dark:text-amber-400">
            {item.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </li>
    ))}
  </ul>
);
