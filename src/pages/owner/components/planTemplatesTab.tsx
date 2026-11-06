import { renewalLabel } from "@/components/plan/planExpired";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { billingFeatureResources, billingResourceLabel } from "@/contants/billingContants";
import { billingService } from "@/services/api/billingService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatNumber } from "../ownerFormat";
import { DialogSavePlanTemplate } from "./dialogSavePlanTemplate";
import { PlanPriceSummary } from "./planAdjustments";

/** "3 Usuários ativos · 1 Números de WhatsApp · Módulo CRM". */
const summarizeItems = (template: PlanTemplate) =>
  template.items
    .filter((item) => item.quantity > 0)
    .map((item) =>
      billingFeatureResources.includes(item.resource)
        ? billingResourceLabel[item.resource]
        : `${formatNumber(item.quantity)} ${billingResourceLabel[item.resource]}`,
    )
    .join(" · ");

const PlanTemplateCard = ({ template, table }: { template: PlanTemplate; table: PriceTable | undefined }) => {
  const queryClient = useQueryClient();

  const deletePlanTemplate = useMutation({
    mutationFn: billingService.deletePlanTemplate,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "planTemplates"] });
      toast.success("Modelo excluído");
    },
  });

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {template.name}
          {!template.isActive && <Badge variant="secondary">Inativo</Badge>}
          <Badge variant="outline">{renewalLabel[template.renewalMonths] ?? `${template.renewalMonths} meses`}</Badge>
        </CardTitle>
        <CardDescription>
          {template.description && <span className="block">{template.description}</span>}
          {summarizeItems(template) || "Nenhum recurso"}
          {template.firstPaymentToImplanter && " · 1º pagamento ao representante"}
          {" · "}
          {template.clientPlans === 0 ? "nenhum tenant" : `${template.clientPlans} tenant(s)`}
        </CardDescription>
        <CardAction className="flex gap-1">
          <DialogSavePlanTemplate
            template={template}
            table={table}
            trigger={
              <Button variant="ghost" size="sm">
                Alterar
              </Button>
            }
          />
          {template.clientPlans === 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={deletePlanTemplate.isPending}
              onClick={() => deletePlanTemplate.mutate({ params: { planTemplateId: template.id } })}
            >
              Excluir
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent>
        {template.price ? (
          <PlanPriceSummary price={template.price} className="sm:max-w-md" />
        ) : (
          <p className="text-muted-foreground text-sm">Sem tabela de preços em vigor.</p>
        )}
      </CardContent>
    </Card>
  );
};

export const PlanTemplatesTab = () => {
  const [showInactive, setShowInactive] = useState<boolean>(false);

  const findPlanTemplatesQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["owner", "planTemplates"],
    queryFn: billingService.findPlanTemplates,
  });

  const findPriceTablesQuery = useQuery({
    queryKey: ["owner", "priceTables"],
    queryFn: billingService.findPriceTables,
  });

  const table = findPriceTablesQuery.data?.find((item) => item.status === "IN_FORCE");
  const templates = findPlanTemplatesQuery.data ?? [];
  const visibleTemplates = templates.filter((template) => showInactive || template.isActive);
  const inactiveCount = templates.length - templates.filter((template) => template.isActive).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Planos prontos para contratar. O preço segue a tabela em vigor, com os descontos e acréscimos do modelo por cima.
        </p>
        <DialogSavePlanTemplate
          table={table}
          trigger={
            <Button>
              <Plus />
              Novo modelo
            </Button>
          }
        />
      </div>

      {findPlanTemplatesQuery.isLoading && <LoadingState />}
      {findPlanTemplatesQuery.isError && (
        <ErrorState
          message="Não foi possível buscar os modelos de plano."
          onRetry={() => findPlanTemplatesQuery.refetch()}
          isRetrying={findPlanTemplatesQuery.isFetching}
        />
      )}
      {findPlanTemplatesQuery.isSuccess && templates.length === 0 && (
        <EmptyState
          title="Nenhum modelo cadastrado"
          description="Crie um, como Essencial ou Profissional, para contratar tenants mais rápido."
        />
      )}

      {visibleTemplates.map((template) => (
        <PlanTemplateCard key={template.id} template={template} table={table} />
      ))}

      {inactiveCount > 0 && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowInactive(!showInactive)}>
          {showInactive ? "Ocultar inativos" : `Ver ${inactiveCount} modelo(s) inativo(s)`}
        </Button>
      )}
    </div>
  );
};
