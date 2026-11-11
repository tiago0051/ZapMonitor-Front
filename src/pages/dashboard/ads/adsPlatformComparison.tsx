import { LoadingState } from "@/components/state-message";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import type { FC } from "react";
import { adPlatformLabel } from "./adsUtils";

const money = (value: number | null, currency: string | null) =>
  value === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: currency ?? "BRL" }).format(value);

/** Custo por conversa, por negócio e por venda de cada plataforma nos últimos 30 dias, para comparar onde a verba rende. */
export const AdsPlatformComparison: FC = () => {
  const { client } = useClientContext();
  const endDate = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const startDate = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const summaryQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "platformSummary", client.id, startDate, endDate],
    queryFn: () => metaAdsService.findPlatformSummary({ params: { clientId: client.id }, queries: { startDate, endDate } }),
    staleTime: 5 * 60_000,
  });
  const rows = [...(summaryQuery.data ?? [])].sort((first, second) => second.spend - first.spend);
  // Venda mais barata ganha destaque; só com pelo menos uma venda
  const best = rows.filter((row) => row.costPerWonDeal !== null).sort((a, b) => a.costPerWonDeal! - b.costPerWonDeal!)[0];

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-base font-semibold">Plataformas lado a lado</h2>
        <p className="text-muted-foreground text-xs">Últimos 30 dias, com as conversas e vendas registradas no CRM.</p>
      </div>
      {summaryQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plataforma</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">Conversas</TableHead>
                <TableHead className="text-right">Custo por conversa</TableHead>
                <TableHead className="text-right">Negócios</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Custo por venda</TableHead>
                <TableHead className="text-right">Retorno</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const conversations = row.crmConversations + row.metaConversations;
                return (
                  <TableRow key={row.platform}>
                    <TableCell className="font-medium">
                      {adPlatformLabel[row.platform]}
                      {best?.platform === row.platform && rows.length > 1 && (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          venda mais barata
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.spend, row.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{conversations}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {money(conversations ? row.spend / conversations : null, row.currency)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.deals}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.wonDeals}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(row.costPerWonDeal, row.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.roas === null ? "—" : `${row.roas.toFixed(1)}x`}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
};
