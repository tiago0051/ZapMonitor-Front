import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingResourceLabel } from "@/contants/billingContants";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { billingService } from "@/services/api/billingService";
import { useQuery } from "@tanstack/react-query";
import { endOfMonth, format, parse, startOfMonth } from "date-fns";
import { useState, type ReactNode } from "react";
import { formatCurrency, formatNumber } from "../ownerFormat";

const ProfitValue = ({ value }: { value: number }) => (
  <span className={cn("tabular-nums", value < 0 && "text-destructive")}>{formatCurrency(value)}</span>
);

const Section = ({ title, description, children }: { title: string; description: string; children: ReactNode }) => (
  <Card className="gap-3">
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="overflow-x-auto">{children}</CardContent>
  </Card>
);

/** Linha "rótulo: valor" dos cards que substituem as tabelas largas no celular. */
const MobileValue = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="text-sm font-semibold tabular-nums">{children}</dd>
  </div>
);

type FinanceTabProps = {
  // Controlado pela tela do dono, que guarda o mês na URL; sem ele, o mês fica só no estado
  month?: string;
  onMonthChange?: (month: string) => void;
};

export const FinanceTab = ({ month: controlledMonth, onMonthChange }: FinanceTabProps) => {
  const isMobile = useIsMobile();
  const [localMonth, setLocalMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const month = controlledMonth ?? localMonth;
  const setMonth = onMonthChange ?? setLocalMonth;

  // O mês inteiro no fuso do navegador
  const monthStart = month ? startOfMonth(parse(month, "yyyy-MM", new Date())) : null;
  const periodQuery = monthStart ? { startDate: monthStart.toISOString(), endDate: endOfMonth(monthStart).toISOString() } : null;

  const findFinanceQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["owner", "finance", periodQuery],
    queryFn: () => billingService.findMonthFinance({ queries: periodQuery! }),
    enabled: !!periodQuery,
  });

  const finance = findFinanceQuery.data;
  const commissions = finance ? finance.saleCommission + finance.recurringCommission : 0;
  const transfers = finance?.firstPaymentTransfer ?? 0;

  const summary = finance
    ? [
        { label: "Receita", value: finance.revenue },
        { label: "Custos dos recursos", value: finance.variableCost },
        { label: "Custos fixos", value: finance.fixedCost },
        { label: "Comissões", value: commissions },
        ...(transfers > 0 ? [{ label: "Repasse do 1º pagamento", value: transfers }] : []),
        { label: "Lucro", value: finance.profit, highlight: true },
      ]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="finance-month">Mês</Label>
          <Input
            id="finance-month"
            type="month"
            value={month}
            max={format(new Date(), "yyyy-MM")}
            onChange={(event) => setMonth(event.target.value)}
          />
        </div>
        {finance && (
          <p className="text-muted-foreground pb-2 text-sm">
            {finance.priceTable
              ? `Tabela com vigência em ${format(finance.priceTable.effectiveFrom, "dd/MM/yyyy")}`
              : "Nenhuma tabela de preços em vigor neste mês"}
            {finance.clientsWithoutPlan > 0 && ` · ${finance.clientsWithoutPlan} tenant(s) sem plano ativo ficam fora do cálculo`}
          </p>
        )}
      </div>

      {findFinanceQuery.isLoading && <LoadingState />}
      {findFinanceQuery.isError && (
        <ErrorState
          message="Não foi possível calcular o mês."
          onRetry={() => findFinanceQuery.refetch()}
          isRetrying={findFinanceQuery.isFetching}
        />
      )}

      {finance && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {summary.map((item) => (
              <Card key={item.label} className={cn("gap-1 py-4", item.highlight && "border-primary")}>
                <CardHeader className="px-4">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-lg break-words sm:text-xl">
                    <ProfitValue value={item.value} />
                  </CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>

          <Section
            title="Representantes"
            description="Comissão de venda (CAC), comissão recorrente e o lucro que os tenants de cada um deixam no mês."
          >
            {finance.implanters.length === 0 ? (
              <EmptyState title="Nenhum tenant com responsável e plano ativo neste mês" />
            ) : isMobile ? (
              <ul className="space-y-3">
                {finance.implanters.map((implanter) => (
                  <li key={implanter.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{implanter.name}</p>
                        <p className="text-muted-foreground truncate text-xs">{implanter.email}</p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-semibold">
                        <span className="text-muted-foreground block text-xs font-normal">Lucro</span>
                        <ProfitValue value={implanter.profit} />
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-2">
                      <MobileValue label="Tenants (novos)">
                        {implanter.clients} ({implanter.newClients})
                      </MobileValue>
                      <MobileValue label="Receita">{formatCurrency(implanter.revenue)}</MobileValue>
                      <MobileValue label="Comissão de venda">{formatCurrency(implanter.saleCommission)}</MobileValue>
                      <MobileValue label="Repasse do 1º pagamento">{formatCurrency(implanter.firstPaymentTransfer)}</MobileValue>
                      <MobileValue label="CAC por tenant">{implanter.cac === null ? "–" : formatCurrency(implanter.cac)}</MobileValue>
                      <MobileValue label="Comissão recorrente">{formatCurrency(implanter.recurringCommission)}</MobileValue>
                      <MobileValue label="Custo total">
                        {formatCurrency(implanter.saleCommission + implanter.firstPaymentTransfer + implanter.recurringCommission)}
                      </MobileValue>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Representante</TableHead>
                    <TableHead className="text-right">Tenants</TableHead>
                    <TableHead className="text-right">Novos</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Comissão de venda</TableHead>
                    <TableHead className="text-right">Repasse do 1º pagamento</TableHead>
                    <TableHead className="text-right">CAC por tenant</TableHead>
                    <TableHead className="text-right">Comissão recorrente</TableHead>
                    <TableHead className="text-right">Custo total</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finance.implanters.map((implanter) => (
                    <TableRow key={implanter.id}>
                      <TableCell>
                        <p className="font-medium">{implanter.name}</p>
                        <p className="text-muted-foreground text-xs">{implanter.email}</p>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{implanter.clients}</TableCell>
                      <TableCell className="text-right tabular-nums">{implanter.newClients}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(implanter.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(implanter.saleCommission)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(implanter.firstPaymentTransfer)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {implanter.cac === null ? "–" : formatCurrency(implanter.cac)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(implanter.recurringCommission)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(implanter.saleCommission + implanter.firstPaymentTransfer + implanter.recurringCommission)}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProfitValue value={implanter.profit} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>

          <Section
            title="Recursos"
            description="Quanto cada recurso vendeu e custou no mês. Usuários, números e API custam pelo contratado; os demais, pelo uso."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recurso</TableHead>
                  <TableHead className="text-right">Contratado</TableHead>
                  <TableHead className="text-right">Usado</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finance.resources.map((resource) => (
                  <TableRow key={resource.resource}>
                    <TableCell>{billingResourceLabel[resource.resource]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(resource.contracted)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {resource.resource === "API_ACCESS" ? "–" : formatNumber(resource.used)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(resource.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(resource.cost)}</TableCell>
                    <TableCell className="text-right">
                      <ProfitValue value={resource.revenue - resource.cost} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          <Section title="Tenants" description="Mensalidade, custos rateados, comissões e lucro de cada tenant com plano ativo no mês.">
            {finance.clients.length === 0 ? (
              <EmptyState title="Nenhum tenant com plano ativo neste mês" />
            ) : isMobile ? (
              <ul className="space-y-3">
                {finance.clients.map((client) => (
                  <li key={client.id} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {client.name} {client.isNew && <Badge variant="outline">Novo</Badge>}
                        </p>
                        <p className="text-muted-foreground truncate text-xs">
                          {client.implanter?.name ?? <span className="italic">Sem responsável</span>}
                        </p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-semibold">
                        <span className="text-muted-foreground block text-xs font-normal">Lucro</span>
                        <ProfitValue value={client.profit} />
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-2">
                      <MobileValue label="Mensalidade">
                        {formatCurrency(client.monthlyFee)}
                        {client.listFee !== client.monthlyFee && (
                          <span className="text-muted-foreground block text-[11px] font-normal">
                            tabela {formatCurrency(client.listFee)}
                          </span>
                        )}
                      </MobileValue>
                      <MobileValue label="Custo dos recursos">{formatCurrency(client.variableCost)}</MobileValue>
                      <MobileValue label="Custo fixo">{formatCurrency(client.fixedCostShare)}</MobileValue>
                      <MobileValue label="Comissões e repasse">
                        {formatCurrency(client.saleCommission + client.firstPaymentTransfer + client.recurringCommission)}
                      </MobileValue>
                    </dl>
                  </li>
                ))}
              </ul>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Representante</TableHead>
                    <TableHead className="text-right">Mensalidade</TableHead>
                    <TableHead className="text-right">Custo dos recursos</TableHead>
                    <TableHead className="text-right">Custo fixo</TableHead>
                    <TableHead className="text-right">Comissões e repasse</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finance.clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <span className="font-medium">{client.name}</span> {client.isNew && <Badge variant="outline">Novo</Badge>}
                      </TableCell>
                      <TableCell>
                        {client.implanter?.name ?? <span className="text-muted-foreground italic">Sem responsável</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(client.monthlyFee)}
                        {client.listFee !== client.monthlyFee && (
                          <p className="text-muted-foreground text-[11px]">tabela {formatCurrency(client.listFee)}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(client.variableCost)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(client.fixedCostShare)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(client.saleCommission + client.firstPaymentTransfer + client.recurringCommission)}
                        {client.firstPaymentTransfer > 0 && <p className="text-muted-foreground text-[11px]">repasse do 1º pagamento</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        <ProfitValue value={client.profit} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </>
      )}
    </div>
  );
};
