import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link2, Loader2, RotateCw } from "lucide-react";
import { useState, type FC } from "react";
import { StrategyLinkCampaignDialog } from "./strategyLinkCampaignDialog";
import { formatMoney, verdictInfo } from "./strategyUtils";

type Props = { strategy: MarketingStrategy; canManage: boolean; onSaved: (strategy: MarketingStrategy) => void };

const rows: { label: string; value: (metrics: StrategyMetrics, currency: string | null) => string }[] = [
  { label: "Gasto", value: (metrics, currency) => formatMoney(metrics.spend, currency) },
  { label: "Conversas", value: (metrics) => String(metrics.conversations) },
  { label: "Negócios qualificados", value: (metrics) => String(metrics.qualifiedDeals) },
  { label: "Vendas", value: (metrics) => String(metrics.wonDeals) },
  { label: "Valor vendido", value: (metrics, currency) => formatMoney(metrics.wonValue, currency) },
  { label: "Custo por conversa", value: (metrics, currency) => formatMoney(metrics.costPerConversation, currency) },
  { label: "Custo por venda", value: (metrics, currency) => formatMoney(metrics.costPerWonDeal, currency) },
  { label: "Retorno (ROAS)", value: (metrics) => (metrics.roas === null ? "—" : `${metrics.roas.toFixed(2).replace(".", ",")}x`) },
  { label: "Dias com gasto", value: (metrics) => String(metrics.activeDays) },
];

/** Resultados: só o que tem a marca da estratégia, comparado ao que está fora dela nas mesmas contas. */
export const StrategyResultsPanel: FC<Props> = ({ strategy, canManage, onSaved }) => {
  const { client, canUseAds } = useClientContext();
  const queryClient = useQueryClient();
  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const queryKey = ["marketingStrategyResults", client.id, strategy.id];

  const resultsQuery = useQuery({
    queryKey,
    queryFn: () => marketingStrategyService.findResults(client.id, strategy.id),
    enabled: strategy.status === "READY" || strategy.status === "ARCHIVED",
  });
  const refresh = useMutation({
    mutationFn: () => marketingStrategyService.findResults(client.id, strategy.id, true),
    onError: requestErrorHandling,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      queryClient.invalidateQueries({ queryKey: ["marketingStrategy", client.id, strategy.id] });
    },
  });

  const data = resultsQuery.data;
  const results = data?.results ?? null;
  const verdict = data?.verdict ?? strategy.verdict;
  const linkedCampaigns = results?.campaigns ?? [];

  return (
    <section className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Resultados da estratégia</h2>
          <p className="text-muted-foreground text-xs">
            Contam só as campanhas com a marca {strategy.marker} (ligadas pelo piloto, pelos atalhos, pela marca no nome ou à mão).
            {results &&
              ` Período: ${format(new Date(`${results.since}T12:00`), "dd/MM")} a ${format(new Date(`${results.until}T12:00`), "dd/MM")}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && canUseAds && (
            <Button size="sm" variant="outline" onClick={() => setIsLinkOpen(true)}>
              <Link2 className="h-4 w-4" />
              Ligar campanha
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={refresh.isPending || resultsQuery.isLoading} onClick={() => refresh.mutate()}>
            {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      {verdict && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", verdictInfo[verdict].className)}>
            {verdictInfo[verdict].label}
          </span>
          <span className="text-muted-foreground">{data?.verdictReason ?? strategy.verdictReason}</span>
        </div>
      )}

      {resultsQuery.isLoading ? (
        <div role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculando…
        </div>
      ) : !results || !linkedCampaigns.length ? (
        <p className="text-muted-foreground text-sm">
          Nenhuma campanha no ar ligada ainda. Quando a campanha montada por um passo for publicada e sincronizada, ela aparece aqui.
          Campanhas antigas podem ser ligadas à mão.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-96 text-sm">
            <thead>
              <tr className="text-muted-foreground border-b text-left text-xs">
                <th className="py-2 pr-3 font-medium">Indicador</th>
                <th className="py-2 pr-3 text-right font-medium">Da estratégia</th>
                <th className="py-2 text-right font-medium">Fora dela</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {row.label}
                  </th>
                  <td className="py-1.5 pr-3 text-right font-medium">{row.value(results.strategy, results.currency)}</td>
                  <td className="text-muted-foreground py-1.5 text-right">
                    {results.baseline ? row.value(results.baseline, results.currency) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-muted-foreground mt-2 text-xs">
            Campanhas ligadas: {linkedCampaigns.map((campaign) => campaign.name).join(" · ")}
          </p>
        </div>
      )}

      {isLinkOpen && (
        <StrategyLinkCampaignDialog
          strategy={strategy}
          onClose={() => setIsLinkOpen(false)}
          onSaved={(saved) => {
            onSaved(saved);
            queryClient.invalidateQueries({ queryKey });
          }}
        />
      )}
    </section>
  );
};
