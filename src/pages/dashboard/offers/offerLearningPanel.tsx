import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { offerService } from "@/services/api/offerService";
import { useQuery } from "@tanstack/react-query";
import { Lightbulb, Plus } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";

type Props = {
  offerId: string;
  data: OfferData;
  canManage: boolean;
  onChange: (changes: Partial<OfferData>) => void;
};

/**
 * O que as vendas ensinam: a conta sobre os negócios fechados com a oferta. As sugestões entram no formulário; nada muda
 * até a pessoa salvar.
 */
export const OfferLearningPanel: FC<Props> = ({ offerId, data, canManage, onChange }) => {
  const { client } = useClientContext();
  const learningQuery = useQuery({
    queryKey: ["offers", client.id, offerId, "learning"],
    queryFn: () => offerService.learning(client.id, offerId),
  });
  const learning = learningQuery.data;
  if (!learning || learning.closed === 0) return null;

  // Sugestão só para os critérios que ainda estão no formulário (pelo id que o back devolveu)
  const suggestions = learning.criteria.filter(
    (item) =>
      item.suggestedWeight !== null &&
      data.qualificationCriteria.some((criterion) => criterion.id === item.id && criterion.weight !== item.suggestedWeight),
  );
  const objectionsToAdd = learning.uncoveredObjections.filter(
    (item) => !data.objections.some((objection) => objection.objection.trim().toLowerCase() === item.text.toLowerCase()),
  );

  const applyWeights = () => {
    onChange({
      qualificationCriteria: data.qualificationCriteria.map((criterion) => {
        const suggestion = suggestions.find((item) => item.id === criterion.id);
        return suggestion?.suggestedWeight ? { ...criterion, weight: suggestion.suggestedWeight } : criterion;
      }),
    });
    toast.success("Pesos aplicados no formulário. Salve para valer.");
  };

  return (
    <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-medium">
          <Lightbulb className="h-4 w-4 text-amber-600" />O que as vendas ensinam
        </h3>
        <p className="text-muted-foreground text-xs">
          {learning.closed} negócio(s) fechado(s) com esta oferta nos últimos 180 dias, {learning.winRate ?? 0}% ganhos.
          {!learning.enough && " Ainda é cedo para concluir: com 10 ou mais fica mais confiável."}
        </p>
      </div>

      {learning.criteria.some((item) => item.lift !== null) && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Critérios de qualificação</p>
          <ul className="space-y-1 text-sm">
            {learning.criteria
              .filter((item) => item.lift !== null)
              .map((item) => (
                <li key={item.id}>
                  <span className="font-medium">{item.label}</span>: {item.metWinRate}% de ganho quando atende, {item.notMetWinRate}% quando
                  não
                  {item.suggestedWeight !== null && item.suggestedWeight !== item.currentWeight && (
                    <span className="text-muted-foreground">
                      {" "}
                      · peso sugerido {item.suggestedWeight} (hoje {item.currentWeight})
                    </span>
                  )}
                </li>
              ))}
          </ul>
          {canManage && suggestions.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={applyWeights}>
              Aplicar pesos sugeridos
            </Button>
          )}
        </div>
      )}

      {objectionsToAdd.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Objeções dos negócios perdidos sem resposta cadastrada</p>
          <ul className="space-y-1 text-sm">
            {objectionsToAdd.map((item) => (
              <li key={item.text} className="flex flex-wrap items-center gap-2">
                <span>
                  "{item.text}" ({item.lost})
                </span>
                {canManage && data.objections.length < 15 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => onChange({ objections: [...data.objections, { objection: item.text, answer: "" }] })}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar e responder
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {learning.proposals.acceptanceRate !== null && (
        <p className="text-sm">
          Propostas: {learning.proposals.acceptanceRate}% aceitas. Desconto médio nas aceitas {learning.proposals.avgDiscountAccepted ?? 0}%
          e nas recusadas {learning.proposals.avgDiscountDeclined ?? 0}%.
        </p>
      )}
    </section>
  );
};
