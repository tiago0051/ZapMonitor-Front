import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import type { FC, ReactNode } from "react";

/**
 * Explica, em texto visível, por que uma ação está bloqueada.
 * Substitui o uso de `title` em botões desabilitados, que não aparece no toque nem para leitor de tela.
 */
export const DisabledReason: FC<{ children?: ReactNode; className?: string; id?: string }> = ({ children, className, id }) => {
  if (!children) return null;
  return (
    <p id={id} role="status" className={cn("flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400", className)}>
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
};
