import { useClientContext } from "@/context/ClientContext/clientContext";
import { salesScriptService } from "@/services/api/salesScriptService";
import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import type { FC } from "react";

/**
 * O que fazer nesta etapa do funil, pelo roteiro de vendas do negócio (da oferta dos itens ou do funil). Some quando não
 * há roteiro ou a etapa do funil não está ligada a uma etapa do roteiro.
 */
export const DealScript: FC<{ deal: Deal }> = ({ deal }) => {
  const { client } = useClientContext();
  const scriptQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["dealScript", client.id, deal.id, deal.stageId],
    queryFn: () => salesScriptService.findDealScript(client.id, deal.id),
    staleTime: 60 * 1000,
  });
  const script = scriptQuery.data?.script;
  const stage = scriptQuery.data?.stage;
  if (!script || !stage) return null;

  return (
    <section className="space-y-2 rounded-lg border p-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <ListChecks className="h-4 w-4" />
        Nesta etapa: {stage.name}
      </p>
      {stage.goal && <p className="text-muted-foreground">{stage.goal}</p>}
      {stage.questions.length > 0 && (
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">Pergunte</p>
          <ul className="list-disc pl-5">
            {stage.questions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      {stage.advanceSignals.length > 0 && (
        <div>
          <p className="text-muted-foreground text-xs font-medium uppercase">Mova o negócio quando</p>
          <ul className="list-disc pl-5">
            {stage.advanceSignals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-muted-foreground text-xs">Roteiro: {script.name}</p>
    </section>
  );
};
