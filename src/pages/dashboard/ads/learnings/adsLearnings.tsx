import { cn } from "@/lib/utils";
import { useState, type FC } from "react";
import { ConversationLearnings } from "./conversationLearnings";
import { LEARNING_PERIODS, type LearningPeriod } from "./learningsUtils";
import { SegmentIntelligence } from "./segmentIntelligence";
import { TraitScoreboard } from "./traitScoreboard";

/** O anúncio aprende com a conversa: o que vende nos criativos, o que as conversas mostram e o que funciona no segmento. */
export const AdsLearnings: FC<{ account: AdAccount }> = ({ account }) => {
  const [days, setDays] = useState<LearningPeriod>(90);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Aprendizados</h2>
          <p className="text-muted-foreground text-sm">O que seus anúncios e as conversas que eles trazem ensinam sobre o que vende.</p>
        </div>
        <div role="radiogroup" aria-label="Período" className="bg-muted inline-flex rounded-lg p-0.5">
          {LEARNING_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              role="radio"
              aria-checked={days === period}
              onClick={() => setDays(period)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                days === period ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {period} dias
            </button>
          ))}
        </div>
      </div>

      <TraitScoreboard account={account} days={days} />
      <ConversationLearnings account={account} days={days} />
      <SegmentIntelligence />
    </div>
  );
};
