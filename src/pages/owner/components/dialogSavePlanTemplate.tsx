import { PLAN_RENEWAL_MONTH_OPTIONS, renewalLabel } from "@/components/plan/planExpired";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { billingResources } from "@/contants/billingContants";
import { billingService } from "@/services/api/billingService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type ReactNode } from "react";
import { toast } from "sonner";
import { calculatePlanPrice } from "../ownerFormat";
import { hasInvalidAdjustment, toAdjustmentBody } from "../planAdjustmentFormat";
import { PlanAdjustmentsEditor, PlanPriceSummary, selectClassName } from "./planAdjustments";
import { PlanQuantitiesTable, type Quantities } from "./planQuantitiesTable";

type Draft = {
  name: string;
  description: string;
  renewalMonths: number;
  firstPaymentToImplanter: boolean;
  isActive: boolean;
  quantities: Quantities;
  adjustments: PlanAdjustment[];
};

/** Novo modelo começa pelo pacote essencial da tabela em vigor. */
const buildDraft = (template: PlanTemplate | undefined, table: PriceTable | undefined): Draft => ({
  name: template?.name ?? "",
  description: template?.description ?? "",
  renewalMonths: template?.renewalMonths ?? 1,
  firstPaymentToImplanter: template?.firstPaymentToImplanter ?? false,
  isActive: template?.isActive ?? true,
  quantities: Object.fromEntries(
    billingResources.map((resource) => [
      resource,
      template
        ? (template.items.find((item) => item.resource === resource)?.quantity ?? 0)
        : (table?.items.find((item) => item.resource === resource)?.minimumQuantity ?? 0),
    ]),
  ) as Quantities,
  adjustments: template?.adjustments.map((adjustment) => ({ ...adjustment })) ?? [],
});

export const DialogSavePlanTemplate: FC<{ template?: PlanTemplate; table: PriceTable | undefined; trigger: ReactNode }> = ({
  template,
  table,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [draft, setDraft] = useState<Draft>(() => buildDraft(template, table));
  const queryClient = useQueryClient();

  const change = (values: Partial<Draft>) => setDraft((current) => ({ ...current, ...values }));

  const savePlanTemplate = useMutation({
    mutationFn: (body: SavePlanTemplateRequestBody) =>
      template
        ? billingService.updatePlanTemplate({ params: { planTemplateId: template.id }, body })
        : billingService.createPlanTemplate({ body }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner", "planTemplates"] });
      toast.success(template ? "Modelo salvo. Os tenants já contratados com ele não mudam." : "Modelo criado");
      setIsOpen(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) setDraft(buildDraft(template, table));
  };

  const price = calculatePlanPrice(table, draft.quantities, draft.adjustments);
  const canSave = draft.name.trim().length > 0 && !hasInvalidAdjustment(draft.adjustments) && !savePlanTemplate.isPending;

  const handleSave = () =>
    savePlanTemplate.mutate({
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      renewalMonths: draft.renewalMonths,
      firstPaymentToImplanter: draft.firstPaymentToImplanter,
      isActive: draft.isActive,
      items: billingResources.map((resource) => ({ resource, quantity: draft.quantities[resource] })),
      adjustments: toAdjustmentBody(draft.adjustments),
    });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{template ? `Modelo ${template.name}` : "Novo modelo de plano"}</DialogTitle>
          <DialogDescription>
            Ao contratar um tenant com o modelo, tudo isto é copiado para o plano dele e ainda pode ser editado. Mudar o modelo depois não
            altera os contratos já feitos.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="plan-template-name">Nome</Label>
              <Input
                id="plan-template-name"
                maxLength={80}
                placeholder="Ex.: Profissional"
                value={draft.name}
                onChange={(event) => change({ name: event.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="plan-template-renewal">Período do contrato</Label>
              <select
                id="plan-template-renewal"
                className={selectClassName}
                value={draft.renewalMonths}
                onChange={(event) => change({ renewalMonths: Number(event.target.value) })}
              >
                {PLAN_RENEWAL_MONTH_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {renewalLabel[option]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="plan-template-description">Descrição (opcional)</Label>
              <Input
                id="plan-template-description"
                maxLength={1000}
                placeholder="Para quem é este plano"
                value={draft.description}
                onChange={(event) => change({ description: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={draft.firstPaymentToImplanter}
                onChange={(event) => change({ firstPaymentToImplanter: event.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium">Primeiro pagamento vai para o representante</span>
                <span className="text-muted-foreground block text-xs">No lugar da comissão de venda e da recorrente do 1º mês.</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={draft.isActive}
                onChange={(event) => change({ isActive: event.target.checked })}
              />
              <span>
                <span className="block text-sm font-medium">Ativo</span>
                <span className="text-muted-foreground block text-xs">Inativo não aparece na hora de contratar um tenant.</span>
              </span>
            </label>
          </div>

          {!table && (
            <p className="text-destructive text-sm">Nenhuma tabela de preços em vigor: o preço do modelo aparece quando houver uma.</p>
          )}
          <PlanQuantitiesTable table={table} quantities={draft.quantities} onChange={(quantities) => change({ quantities })} />
          <PlanAdjustmentsEditor
            idPrefix="plan-template"
            adjustments={draft.adjustments}
            onChange={(adjustments) => change({ adjustments })}
          />
          {table && <PlanPriceSummary price={price} className="rounded-md border p-3" />}
        </div>

        <DialogFooter>
          <Button type="button" disabled={!canSave} onClick={handleSave}>
            {template ? "Salvar modelo" : "Criar modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
