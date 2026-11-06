import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sparkles, Trophy } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { fieldSelectClassName } from "../campaign/campaignUtils";
import { formatCount, formatMoney } from "../adsUtils";
import { scoreVerdictInfo } from "./pilotUtils";

type Props = { account: AdAccount; brand: AdBrandProfile; onChange: (brand: AdBrandProfile) => void };

const PERIODS = [14, 30, 90];

const PatternList: FC<{ title: string; items: string[] }> = ({ title, items }) =>
  items.length > 0 && (
    <div>
      <p className="text-xs font-medium">{title}</p>
      <ul className="text-muted-foreground list-disc pl-4 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );

/** Cada anúncio com a imagem, o texto e o resultado até a venda no CRM, e os padrões que a IA tirou deles. */
export const PilotScoreboard: FC<Props> = ({ account, brand, onChange }) => {
  const { client, can } = useClientContext();
  const params = { clientId: client.id, accountId: account.id };
  const [days, setDays] = useState(90);

  const scoreboardQuery = useQuery({
    queryKey: ["metaAds", "pilotScoreboard", client.id, account.id, days],
    queryFn: () => metaAdsService.findScoreboard({ params, days }),
  });
  const analyze = useMutation({
    mutationFn: () => metaAdsService.analyzeCreatives({ params }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onChange(updated);
      toast.success("Padrões dos criativos atualizados");
    },
  });

  const scores = scoreboardQuery.data ?? [];
  const insights = brand.creativeInsights;
  const hasVerdicts = scores.some((score) => score.verdict !== "LEARNING");

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold">3. Placar de criativos</h2>
          <p className="text-muted-foreground text-sm">
            Vence quem vende no CRM; perde quem já tem dados suficientes e não trouxe conversa ou trouxe 10 conversas sem negócio. Anúncio
            com menos de 3 dias no ar, 1.000 impressões ou o gasto de 3 conversas no custo médio da conta ainda não é julgado.
          </p>
        </div>
        <select
          aria-label="Período do placar"
          className={cn(fieldSelectClassName, "w-36")}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          {PERIODS.map((period) => (
            <option key={period} value={period}>
              Últimos {period} dias
            </option>
          ))}
        </select>
        {can("ads.manage") && (
          <Button size="sm" disabled={analyze.isPending || !hasVerdicts} onClick={() => analyze.mutate()}>
            <Sparkles className="h-4 w-4" />
            {analyze.isPending ? "Comparando…" : "Comparar criativos com IA"}
          </Button>
        )}
      </div>

      {insights && (
        <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
          <p className="text-sm sm:col-span-3">
            {insights.summary}
            {brand.creativeInsightsAt && (
              <span className="text-muted-foreground text-xs"> · {format(new Date(brand.creativeInsightsAt), "dd/MM/yyyy")}</span>
            )}
          </p>
          <PatternList title="O que vence" items={insights.winningPatterns} />
          <PatternList title="O que perde" items={insights.losingPatterns} />
          <PatternList title="Para os próximos criativos" items={insights.recommendations} />
        </div>
      )}

      {scoreboardQuery.isLoading && <LoadingState />}
      {scoreboardQuery.isError && (
        <ErrorState
          message="Não foi possível carregar o placar."
          onRetry={() => scoreboardQuery.refetch()}
          isRetrying={scoreboardQuery.isFetching}
        />
      )}
      {scoreboardQuery.isSuccess && scores.length === 0 && (
        <EmptyState
          icon={Trophy}
          title="Nenhum anúncio gastou no período"
          description="Sem histórico, o piloto monta uma campanha de teste com ângulos diferentes para descobrir o que funciona."
        />
      )}
      {scores.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criativo</TableHead>
                <TableHead>Veredito</TableHead>
                <TableHead className="text-right">Gasto</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Conversas</TableHead>
                <TableHead className="text-right">Negócios</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="text-right">Custo por conversa</TableHead>
                <TableHead className="text-right">Custo por venda</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scores.map((score) => (
                <TableRow key={score.metaAdId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {score.imageUrl ? (
                        <img src={score.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded object-cover" loading="lazy" />
                      ) : (
                        <div className="bg-muted h-12 w-12 shrink-0 rounded" />
                      )}
                      <div className="max-w-72 min-w-0">
                        <p className="truncate text-sm font-medium">{score.name}</p>
                        {score.title && <p className="text-muted-foreground truncate text-xs">{score.title}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      title={score.missingData ?? undefined}
                      className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", scoreVerdictInfo(score).className)}
                    >
                      {scoreVerdictInfo(score).label}
                    </span>
                    {score.missingData && <p className="text-muted-foreground mt-1 max-w-56 text-xs">{score.missingData}</p>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(score.spend, account.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{score.ctr === null ? "—" : `${formatCount(score.ctr, 2)}%`}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(score.conversations)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(score.deals)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCount(score.wonDeals)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(score.costPerConversation, account.currency)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(score.costPerWonDeal, account.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
};
