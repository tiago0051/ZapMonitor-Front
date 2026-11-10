import { CardDescription } from "@/components/ui/card";
import { useId, useState, type ReactNode } from "react";

/**
 * Descrição de cabeçalho com uma frase curta visível e o restante atrás de "Saiba mais".
 */
export const ExpandableDescription = ({ summary, children }: { summary: ReactNode; children: ReactNode }) => {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  return (
    <CardDescription>
      {summary}{" "}
      <button
        type="button"
        className="text-primary font-medium underline-offset-2 hover:underline"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Mostrar menos" : "Saiba mais"}
      </button>
      <span id={detailsId} hidden={!expanded} className="mt-1 block">
        {children}
      </span>
    </CardDescription>
  );
};
