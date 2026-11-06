import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { billingFeatureResources, billingResourceLabel, billingResourceUnit, billingResources } from "@/contants/billingContants";
import type { FC } from "react";
import { formatCurrency, formatNumber } from "../ownerFormat";

export type Quantities = Record<BillingResource, number>;

/** Quantidade de cada recurso, com o preço da tabela; com uso, mostra também o consumo do mês. */
export const PlanQuantitiesTable: FC<{
  table: PriceTable | undefined;
  quantities: Quantities;
  onChange: (quantities: Quantities) => void;
  usage?: Partial<Record<BillingResource, number>>;
}> = ({ table, quantities, onChange, usage }) => {
  const setQuantity = (resource: BillingResource, quantity: number) =>
    onChange({ ...quantities, [resource]: Number.isNaN(quantity) ? 0 : quantity });

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Recurso</TableHead>
            {usage && <TableHead className="text-right">Uso no mês</TableHead>}
            <TableHead>Contratado</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {billingResources.map((resource) => {
            const item = table?.items.find((tableItem) => tableItem.resource === resource);
            const isFeature = billingFeatureResources.includes(resource);
            const minimum = item?.minimumQuantity ?? 0;

            return (
              <TableRow key={resource}>
                <TableCell>
                  <p className="font-medium">{billingResourceLabel[resource]}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatCurrency(item?.unitPrice ?? 0)} {billingResourceUnit[resource]}
                    {minimum > 0 && ` · mínimo ${minimum}`}
                  </p>
                </TableCell>
                {usage && <TableCell className="text-right tabular-nums">{isFeature ? "–" : formatNumber(usage[resource] ?? 0)}</TableCell>}
                <TableCell className="min-w-28">
                  {isFeature ? (
                    <input
                      type="checkbox"
                      aria-label={billingResourceLabel[resource]}
                      className="h-4 w-4"
                      checked={quantities[resource] > 0}
                      onChange={(event) => setQuantity(resource, event.target.checked ? 1 : 0)}
                    />
                  ) : (
                    <Input
                      type="number"
                      aria-label={billingResourceLabel[resource]}
                      min={minimum}
                      step={1}
                      value={quantities[resource]}
                      onChange={(event) => setQuantity(resource, event.target.valueAsNumber)}
                    />
                  )}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(quantities[resource] * (item?.unitPrice ?? 0))}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
