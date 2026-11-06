import { LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingFeatureResources, billingResourceLabel, billingResourceUnit, billingResources } from "@/contants/billingContants";
import { billingService } from "@/services/api/billingService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { calculateMonthlyFee, formatCurrency, formatNumber } from "../ownerFormat";
import { formatPlanDate, PLAN_RENEWAL_MONTH_OPTIONS, renewalLabel } from "@/components/plan/planExpired";
import { PlanRenewControl, PlanStatusBadge } from "@/components/plan/planRenewalFields";

type Quantities = Record<BillingResource, number>;

const toInputDate = (date: Date) => format(date, "yyyy-MM-dd");

export const DialogClientPlan: FC<{ client: OwnerClient }> = ({ client }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [quantities, setQuantities] = useState<Quantities | null>(null);
  // Nulo enquanto não alterado: vale o início do plano, ou hoje para um plano novo
  const [startedAt, setStartedAt] = useState<string | null>(null);
  // undefined enquanto não alterado (vale o salvo); "" tira o vencimento
  const [dueDate, setDueDate] = useState<string | undefined>(undefined);
  const [renewalMonths, setRenewalMonths] = useState<number | undefined>(undefined);
  const [firstPaymentToImplanter, setFirstPaymentToImplanter] = useState<boolean | undefined>(undefined);
  const queryClient = useQueryClient();

  const findPlanQuery = useQuery({
    queryKey: ["owner", "plan", client.id],
    queryFn: () => billingService.findClientPlan({ params: { clientId: client.id } }),
    enabled: isOpen,
  });

  const findPriceTablesQuery = useQuery({
    queryKey: ["owner", "priceTables"],
    queryFn: billingService.findPriceTables,
    enabled: isOpen,
  });

  const plan = findPlanQuery.data;
  const table = findPriceTablesQuery.data?.find((item) => item.status === "IN_FORCE");
  const minimumOf = (resource: BillingResource) => table?.items.find((item) => item.resource === resource)?.minimumQuantity ?? 0;

  // Sem plano, começa pelo pacote essencial da tabela em vigor
  const currentQuantities: Quantities =
    quantities ??
    (Object.fromEntries(
      billingResources.map((resource) => {
        const planQuantity = plan?.resources.find((item) => item.resource === resource)?.quantity;
        return [resource, plan?.startedAt ? (planQuantity ?? 0) : minimumOf(resource)];
      }),
    ) as Quantities);

  const isActive = !!plan?.startedAt && !plan.endedAt;
  const currentStartedAt = startedAt ?? toInputDate(plan?.startedAt ? new Date(plan.startedAt) : new Date());

  const onSuccess = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["owner"] });
    toast.success(message);
    setIsOpen(false);
  };

  const savePlan = useMutation({
    mutationFn: billingService.saveClientPlan,
    onError: requestErrorHandling,
    onSuccess: () => onSuccess("Plano salvo com sucesso"),
  });

  const renewPlan = useMutation({
    mutationFn: billingService.renewClientPlan,
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      queryClient.setQueryData(["owner", "plan", client.id], updated);
      queryClient.invalidateQueries({ queryKey: ["owner", "clients"] });
      setDueDate(undefined);
      toast.success(
        `Plano renovado até ${updated.status.dueDate ? formatPlanDate(updated.status.dueDate) : "—"}. O acesso dos usuários já voltou.`,
      );
    },
  });

  const endPlan = useMutation({
    mutationFn: billingService.endClientPlan,
    onError: requestErrorHandling,
    onSuccess: () => onSuccess("Plano encerrado"),
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setQuantities(null);
    setStartedAt(null);
    setDueDate(undefined);
    setRenewalMonths(undefined);
    setFirstPaymentToImplanter(undefined);
  };

  const currentDueDate = dueDate ?? plan?.status.dueDate ?? "";
  const currentRenewalMonths = renewalMonths ?? plan?.status.renewalMonths ?? 1;
  const currentFirstPaymentToImplanter = firstPaymentToImplanter ?? plan?.firstPaymentToImplanter ?? false;

  const handleSave = () => {
    savePlan.mutate({
      params: { clientId: client.id },
      body: {
        startedAt: new Date(`${currentStartedAt}T00:00:00`).toISOString(),
        items: billingResources.map((resource) => ({ resource, quantity: currentQuantities[resource] })),
        dueDate: currentDueDate || null,
        renewalMonths: currentRenewalMonths,
        firstPaymentToImplanter: currentFirstPaymentToImplanter,
      },
    });
  };

  const setQuantity = (resource: BillingResource, quantity: number) =>
    setQuantities({ ...currentQuantities, [resource]: Number.isNaN(quantity) ? 0 : quantity });

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Plano de {client.name}
            {plan && (
              <Badge variant={isActive ? "default" : "secondary"}>{!plan.startedAt ? "Sem plano" : isActive ? "Ativo" : "Encerrado"}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {!plan?.startedAt
              ? "Sem plano, o tenant não tem limites. Ao salvar, os limites passam a valer e o tenant é bloqueado ao atingi-los."
              : "Ao atingir uma quantidade contratada, o tenant é bloqueado até contratar mais."}
          </DialogDescription>
        </DialogHeader>

        {(findPlanQuery.isLoading || findPriceTablesQuery.isLoading) && <LoadingState />}
        {findPriceTablesQuery.isSuccess && !table && (
          <p className="text-destructive text-sm">Nenhuma tabela de preços em vigor. Cadastre uma na aba Preços.</p>
        )}

        {plan && table && (
          <div className="grid gap-4">
            <div className="space-y-1 sm:max-w-xs">
              <Label htmlFor="plan-started-at">Início da cobrança</Label>
              <Input id="plan-started-at" type="date" value={currentStartedAt} onChange={(event) => setStartedAt(event.target.value)} />
              <p className="text-muted-foreground text-xs">O mês de início gera a comissão de venda do representante.</p>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border p-3">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={currentFirstPaymentToImplanter}
                onChange={(event) => setFirstPaymentToImplanter(event.target.checked)}
              />
              <span>
                <span className="block text-sm font-medium">Primeiro pagamento vai para o representante</span>
                <span className="text-muted-foreground block text-xs">
                  No mês de início, a mensalidade inteira é repassada ao representante no lugar da comissão de venda e da recorrente daquele
                  mês. A comissão recorrente volta a partir do segundo mês.
                  {!client.implanter && " Este tenant ainda não tem representante: sem ele, não há repasse."}
                </span>
              </span>
            </label>

            <div className="grid gap-3 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium">Vencimento</p>
                {plan.startedAt && <PlanStatusBadge status={plan.status} />}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="plan-due-date">Último dia pago</Label>
                  <Input id="plan-due-date" type="date" value={currentDueDate} onChange={(event) => setDueDate(event.target.value)} />
                  <p className="text-muted-foreground text-xs">
                    No dia seguinte os usuários perdem o acesso; o atendimento automático continua. Vazio, o tenant nunca é bloqueado.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="plan-renewal-months">Período do contrato</Label>
                  <select
                    id="plan-renewal-months"
                    className="border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={currentRenewalMonths}
                    onChange={(event) => setRenewalMonths(Number(event.target.value))}
                  >
                    {PLAN_RENEWAL_MONTH_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {renewalLabel[option]}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-xs">
                    O quanto o Renovar soma por padrão. O implantador recebe aviso 7 dias antes.
                  </p>
                </div>
              </div>
              {isActive && (
                <div className="flex flex-wrap items-center gap-3 border-t pt-3">
                  <PlanRenewControl
                    status={plan.status}
                    isPending={renewPlan.isPending}
                    onRenew={(months) => renewPlan.mutate({ params: { clientId: client.id }, body: { months } })}
                  />
                  <p className="text-muted-foreground text-xs">
                    Em dia, soma a partir do vencimento atual; vencido, a partir de hoje. Libera o acesso na hora.
                  </p>
                </div>
              )}
              {plan.renewals.length > 0 && (
                <ul className="text-muted-foreground space-y-0.5 border-t pt-2 text-xs">
                  {plan.renewals.slice(0, 5).map((renewal) => (
                    <li key={renewal.id}>
                      {format(new Date(renewal.createdAt), "dd/MM/yyyy")}: renovado até {formatPlanDate(renewal.newDueDate)} (+
                      {renewal.months} {renewal.months === 1 ? "mês" : "meses"}){renewal.renewedByName && ` por ${renewal.renewedByName}`}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recurso</TableHead>
                    <TableHead className="text-right">Uso no mês</TableHead>
                    <TableHead>Contratado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingResources.map((resource) => {
                    const item = table.items.find((tableItem) => tableItem.resource === resource);
                    const used = plan.resources.find((planResource) => planResource.resource === resource)?.used ?? 0;
                    const isFeature = billingFeatureResources.includes(resource);
                    const minimum = minimumOf(resource);

                    return (
                      <TableRow key={resource}>
                        <TableCell>
                          <p className="font-medium">{billingResourceLabel[resource]}</p>
                          <p className="text-muted-foreground text-xs">
                            {formatCurrency(item?.unitPrice ?? 0)} {billingResourceUnit[resource]}
                            {minimum > 0 && ` · mínimo ${minimum}`}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{isFeature ? "–" : formatNumber(used)}</TableCell>
                        <TableCell className="min-w-28">
                          {isFeature ? (
                            <input
                              type="checkbox"
                              aria-label={billingResourceLabel[resource]}
                              className="h-4 w-4"
                              checked={currentQuantities[resource] > 0}
                              onChange={(event) => setQuantity(resource, event.target.checked ? 1 : 0)}
                            />
                          ) : (
                            <Input
                              type="number"
                              min={minimum}
                              step={1}
                              value={currentQuantities[resource]}
                              onChange={(event) => setQuantity(resource, event.target.valueAsNumber)}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(currentQuantities[resource] * (item?.unitPrice ?? 0))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <p className="text-right text-sm">
              Mensalidade pela tabela em vigor:{" "}
              <span className="text-base font-semibold">{formatCurrency(calculateMonthlyFee(table, currentQuantities))}</span>
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {isActive && (
            <Button
              type="button"
              variant="outline"
              disabled={endPlan.isPending || savePlan.isPending}
              onClick={() => endPlan.mutate({ params: { clientId: client.id } })}
            >
              Encerrar plano
            </Button>
          )}
          <Button type="button" disabled={!plan || !table || savePlan.isPending || endPlan.isPending} onClick={handleSave}>
            Salvar plano
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
