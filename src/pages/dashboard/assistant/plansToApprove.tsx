import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { assistantService } from "@/services/api/assistantService";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useRef, type FC } from "react";
import { assistantKeys } from "./assistantUtils";
import { PlanCard } from "./components/planCard";

/** Planos com passos que eu posso aprovar; o plano do link (?plan=) aparece em destaque mesmo se não estiver na lista. */
export const PlansToApprove: FC<{ highlightedPlanId: string | null }> = ({ highlightedPlanId }) => {
  const { client } = useClientContext();

  const plansQuery = useQuery({
    queryKey: assistantKeys.awaitingMe(client.id),
    queryFn: () => assistantService.findPlans(client.id, { awaitingMe: true }),
  });
  const plans = plansQuery.data ?? [];
  const linkedInList = !!highlightedPlanId && plans.some((plan) => plan.id === highlightedPlanId);

  const linkedQuery = useQuery({
    queryKey: assistantKeys.plan(client.id, highlightedPlanId ?? ""),
    queryFn: () => assistantService.findPlan(client.id, highlightedPlanId!),
    enabled: !!highlightedPlanId && plansQuery.isSuccess && !linkedInList,
  });
  const linkedPlan = !linkedInList ? linkedQuery.data : undefined;

  const scrolledRef = useRef<string | null>(null);
  const linkedReady = linkedInList || !!linkedPlan;
  useEffect(() => {
    if (!highlightedPlanId || !linkedReady || scrolledRef.current === highlightedPlanId) return;
    scrolledRef.current = highlightedPlanId;
    document.getElementById(`assistant-plan-${highlightedPlanId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [highlightedPlanId, linkedReady]);

  if (plansQuery.isLoading) return <LoadingState label="Carregando planos..." />;
  if (plansQuery.isError)
    return (
      <ErrorState message="Não foi possível buscar os planos." onRetry={() => plansQuery.refetch()} isRetrying={plansQuery.isFetching} />
    );

  return (
    <div className="grid gap-4">
      {highlightedPlanId && !linkedInList && linkedQuery.isLoading && <LoadingState label="Abrindo o plano..." />}
      {highlightedPlanId && !linkedInList && linkedQuery.isError && (
        <ErrorState message="Não foi possível abrir o plano do link." onRetry={() => linkedQuery.refetch()} />
      )}
      {linkedPlan && <PlanCard key={linkedPlan.id} plan={linkedPlan} highlighted />}

      {plans.length === 0 && !linkedPlan && (
        <EmptyState
          icon={CheckCircle2}
          title="Nada esperando por você"
          description="Quando o assistente propuser um plano com passos que você pode aprovar, ele aparece aqui."
        />
      )}
      {plans.map((plan) => (
        <PlanCard key={plan.id} plan={plan} highlighted={plan.id === highlightedPlanId} />
      ))}
    </div>
  );
};
