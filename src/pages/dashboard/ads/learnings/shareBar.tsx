import { cn } from "@/lib/utils";
import type { FC } from "react";
import { formatShare, shareOffset } from "./learningsUtils";

/** Barra horizontal centrada em 1x: para a direita vende mais que a parte da verba, para a esquerda vende menos. */
export const ShareBar: FC<{ value: number | null; muted?: boolean; className?: string }> = ({ value, muted, className }) => {
  const offset = value === null ? 0 : shareOffset(value);
  const width = `${Math.abs(offset) * 50}%`;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="bg-muted relative h-2 flex-1 overflow-hidden rounded-full" aria-hidden>
        <span className="bg-foreground/30 absolute inset-y-0 left-1/2 w-px" />
        {value !== null && (
          <span
            className={cn(
              "absolute inset-y-0",
              offset >= 0 ? "left-1/2 rounded-r-full" : "right-1/2 rounded-l-full",
              muted ? "bg-muted-foreground/40" : offset >= 0 ? "bg-green-600 dark:bg-green-500" : "bg-rose-500",
            )}
            style={{ width }}
          />
        )}
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-medium tabular-nums">{value === null ? "—" : formatShare(value)}</span>
    </div>
  );
};
