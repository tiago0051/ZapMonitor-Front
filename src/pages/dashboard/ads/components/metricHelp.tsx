import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import type { FC } from "react";
import { metricGlossary, type GlossaryTerm } from "../adsUtils";

/**
 * Botão "o que é isso" ao lado de siglas da Meta (CTR, ROAS, CPA, Advantage+).
 * Abre ao tocar ou clicar (tooltip não funciona no celular).
 */
export const MetricHelp: FC<{ term: GlossaryTerm; className?: string }> = ({ term, className }) => {
  const entry = metricGlossary[term];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`O que é ${entry.title}?`}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 inline-flex shrink-0 rounded-full align-middle outline-none focus-visible:ring-[3px]",
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-64 space-y-1 p-3 text-left text-xs font-normal whitespace-normal">
        <p className="text-sm font-semibold">{entry.title}</p>
        <p className="text-muted-foreground">{entry.description}</p>
      </PopoverContent>
    </Popover>
  );
};
