import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingResourceLabel, billingResourceUnit, priceTableStatusLabel } from "@/contants/billingContants";
import { billingService } from "@/services/api/billingService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatCurrency } from "../ownerFormat";
import { DialogSavePriceTable } from "./dialogSavePriceTable";

const statusVariant: Record<PriceTableStatus, "default" | "secondary" | "outline"> = {
  IN_FORCE: "default",
  SCHEDULED: "outline",
  PAST: "secondary",
};

const PriceTableCard = ({ table }: { table: PriceTable }) => {
  const queryClient = useQueryClient();
  const fixedCost = table.fixedCosts.reduce((total, item) => total + item.monthlyAmount, 0);

  const deletePriceTable = useMutation({
    mutationFn: billingService.deletePriceTable,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner"] });
      toast.success("Tabela excluída");
    },
  });

  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Vigência em {format(table.effectiveFrom, "dd/MM/yyyy HH:mm")}
          <Badge variant={statusVariant[table.status]}>{priceTableStatusLabel[table.status]}</Badge>
        </CardTitle>
        <CardDescription>
          {table.notes ?? "Sem observação"} · comissão: {formatCurrency(table.saleCommissionFixed)} + {table.saleCommissionMonthlyFees}{" "}
          mensalidade(s) na venda e {table.recurringCommissionPercent}% ao mês · custos fixos {formatCurrency(fixedCost)}
        </CardDescription>
        {table.status === "SCHEDULED" && (
          <CardAction className="flex gap-1">
            <DialogSavePriceTable
              table={table}
              trigger={
                <Button variant="ghost" size="sm">
                  Alterar
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={deletePriceTable.isPending}
              onClick={() => deletePriceTable.mutate({ params: { priceTableId: table.id } })}
            >
              Excluir
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recurso</TableHead>
              <TableHead className="text-right">Custo</TableHead>
              <TableHead className="text-right">Preço</TableHead>
              <TableHead className="text-right">Margem</TableHead>
              <TableHead className="text-right">Mínimo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {table.items.map((item) => (
              <TableRow key={item.resource}>
                <TableCell>
                  {billingResourceLabel[item.resource]}{" "}
                  <span className="text-muted-foreground text-xs">{billingResourceUnit[item.resource]}</span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(item.unitCost)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(item.unitPrice)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.unitPrice > 0 ? `${(((item.unitPrice - item.unitCost) / item.unitPrice) * 100).toFixed(0)}%` : "–"}
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.minimumQuantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export const PriceTablesTab = () => {
  const [showPast, setShowPast] = useState<boolean>(false);

  const findPriceTablesQuery = useQuery({
    queryKey: ["owner", "priceTables"],
    queryFn: billingService.findPriceTables,
  });

  const tables = findPriceTablesQuery.data ?? [];
  const visibleTables = tables.filter((table) => showPast || table.status !== "PAST");
  const pastCount = tables.filter((table) => table.status === "PAST").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Para mudar valores, agende uma nova versão. Ela passa a valer sozinha na data de vigência.
        </p>
        <DialogSavePriceTable
          baseTable={tables[0]}
          trigger={
            <Button>
              <Plus />
              Nova versão
            </Button>
          }
        />
      </div>

      {findPriceTablesQuery.isLoading && <p>Carregando...</p>}
      {findPriceTablesQuery.isError && <p>Erro ao buscar as tabelas de preços.</p>}
      {findPriceTablesQuery.isSuccess && tables.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma tabela cadastrada. Agende a primeira para poder definir planos.</p>
      )}

      {visibleTables.map((table) => (
        <PriceTableCard key={table.id} table={table} />
      ))}

      {pastCount > 0 && (
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setShowPast(!showPast)}>
          {showPast ? "Ocultar tabelas anteriores" : `Ver ${pastCount} tabela(s) anterior(es)`}
        </Button>
      )}
    </div>
  );
};
