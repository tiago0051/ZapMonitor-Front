import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingResourceLabel } from "@/contants/billingContants";
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

export const FinanceTab = () => {
  const [month, setMonth] = useState<string>(format(new Date(), "yyyy-MM"));

  // O mês inteiro no fuso do navegador
  const monthStart = month ? startOfMonth(parse(month, "yyyy-MM", new Date())) : null;
  const periodQuery = monthStart ? { startDate: monthStart.toISOString(), endDate: endOfMonth(monthStart).toISOString() } : null;

  const findFinanceQuery = useQuery({
    queryKey: ["owner", "finance", periodQuery],
    queryFn: () => billingService.findMonthFinance({ queries: periodQuery! }),
    enabled: !!periodQuery,
  });

  const finance = findFinanceQuery.data;
  const commissions = finance ? finance.saleCommission + finance.recurringCommission : 0;

  const summary = finance
    ? [
        { label: "Receita", value: finance.revenue },
        { label: "Custos dos recursos", value: finance.variableCost },
        { label: "Custos fixos", value: finance.fixedCost },
        { label: "Comissões", value: commissions },
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

      {findFinanceQuery.isLoading && <p>Carregando...</p>}
      {findFinanceQuery.isError && <p>Erro ao calcular o mês.</p>}

      {finance && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {summary.map((item) => (
              <Card key={item.label} className={cn("gap-1 py-4", item.highlight && "border-primary")}>
                <CardHeader className="px-4">
                  <CardDescription>{item.label}</CardDescription>
                  <CardTitle className="text-xl">
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
              <p className="text-muted-foreground text-sm">Nenhum tenant com responsável e plano ativo neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Representante</TableHead>
                    <TableHead className="text-right">Tenants</TableHead>
                    <TableHead className="text-right">Novos</TableHead>
                    <TableHead className="text-right">Receita</TableHead>
                    <TableHead className="text-right">Comissão de venda</TableHead>
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
                      <TableCell className="text-right tabular-nums">
                        {implanter.cac === null ? "–" : formatCurrency(implanter.cac)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(implanter.recurringCommission)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(implanter.saleCommission + implanter.recurringCommission)}
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
              <p className="text-muted-foreground text-sm">Nenhum tenant com plano ativo neste mês.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Representante</TableHead>
                    <TableHead className="text-right">Mensalidade</TableHead>
                    <TableHead className="text-right">Custo dos recursos</TableHead>
                    <TableHead className="text-right">Custo fixo</TableHead>
                    <TableHead className="text-right">Comissões</TableHead>
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
                      <TableCell className="text-right tabular-nums">{formatCurrency(client.monthlyFee)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(client.variableCost)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatCurrency(client.fixedCostShare)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(client.saleCommission + client.recurringCommission)}
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
