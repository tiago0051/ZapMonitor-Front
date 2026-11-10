import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Palette, ScanSearch } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { formatCount, formatMoney } from "../adsUtils";
import { MetricHelp } from "../components/metricHelp";
import { SteppedProgress } from "../components/steppedProgress";
import { TRAIT_MIN_TOTAL_SALES, verdictInfo } from "./learningsUtils";
import { ShareBar } from "./shareBar";

const DNA_STEPS = [
  "Separando os anúncios que ainda não foram lidos…",
  "Lendo textos e imagens dos criativos…",
  "Anotando gancho, oferta, tom e formato…",
  "Montando o placar com as vendas…",
];

const VerdictChip: FC<{ verdict: AdTraitVerdict }> = ({ verdict }) => (
  <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", verdictInfo[verdict].className)}>
    {verdictInfo[verdict].label}
  </span>
);

const TraitCard: FC<{ trait: AdTraitScore; currency: string }> = ({ trait, currency }) => {
  // Quem vende mais em cima; valores sem número ficam no fim
  const values = [...trait.values].sort((a, b) => (b.salesIndex ?? -1) - (a.salesIndex ?? -1));

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h4 className="text-sm font-semibold">{trait.label}</h4>
      <ul className="space-y-3">
        {values.map((value) => (
          <li key={value.value} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm">{value.label}</span>
              <VerdictChip verdict={value.verdict} />
            </div>
            <ShareBar value={value.salesIndex} muted={value.verdict === "LEARNING"} />
            <p className="text-muted-foreground text-xs">
              {formatCount(value.sales)} venda(s) ·{" "}
              {value.costPerSale === null ? "sem venda ainda" : `${formatMoney(value.costPerSale, currency)} por venda`} · {value.ads}{" "}
              anúncio(s)
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

/** Placar por característica do criativo (gancho, oferta, formato…) cruzado com as vendas do CRM. */
export const TraitScoreboard: FC<{ account: AdAccount; days: number }> = ({ account, days }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "traitScoreboard", client.id, account.id, days],
    queryFn: () => metaAdsService.findTraitScoreboard(client.id, account.id, { days }),
  });

  const analyze = useMutation({
    mutationFn: () => metaAdsService.analyzeCreativeDna(client.id, account.id),
    onError: requestErrorHandling,
    onSuccess: (coverage) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "traitScoreboard", client.id, account.id] });
      toast.success(
        coverage.pending > 0
          ? `${coverage.analyzed} de ${coverage.total} anúncios lidos. Os outros ${coverage.pending} serão lidos em seguida.`
          : `Pronto: ${coverage.analyzed} de ${coverage.total} anúncios lidos.`,
      );
    },
  });

  const board = query.data;
  const coverage = board?.coverage;
  const traits = board?.traits.filter((trait) => trait.values.length > 0) ?? [];

  return (
    <section className="space-y-3">
      <div>
        <h3 className="flex items-center gap-1.5 text-base font-semibold">
          O que vende nos seus criativos
          <MetricHelp term="SALES_SHARE" />
        </h3>
        <p className="text-muted-foreground text-sm">
          A IA lê cada anúncio (gancho, oferta, tom, formato) e o placar cruza isso com as vendas do CRM. A barra mostra quanto cada
          característica vende em relação à verba que levou: no meio é a média, para a direita vende mais.
        </p>
      </div>

      {coverage && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <ScanSearch className="text-primary h-5 w-5 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm">
              <span className="font-medium tabular-nums">
                {coverage.analyzed} de {coverage.total}
              </span>{" "}
              anúncios com gasto já foram lidos
              {coverage.pending > 0 && <span className="text-muted-foreground"> · faltam {coverage.pending}</span>}
            </p>
            <SteppedProgress active={analyze.isPending} steps={DNA_STEPS} interval={10000} />
          </div>
          {can("ads.manage") && coverage.pending > 0 && (
            <Button size="sm" variant="outline" disabled={analyze.isPending} onClick={() => analyze.mutate()}>
              {analyze.isPending ? "Lendo…" : "Ler criativos agora"}
            </Button>
          )}
        </div>
      )}

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Não foi possível carregar o placar." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}

      {board && board.totals.sales < TRAIT_MIN_TOTAL_SALES && traits.length > 0 && (
        <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          Por enquanto são {board.totals.sales} venda(s) vindas de anúncios no período. O placar diz o que vende mais ou menos a partir de{" "}
          {TRAIT_MIN_TOTAL_SALES} vendas; até lá tudo aparece como "Aprendendo". Marque as vendas no CRM para ele aprender mais rápido.
        </p>
      )}

      {board && traits.length === 0 && (
        <EmptyState
          icon={Palette}
          title="Nenhum criativo lido no período"
          description={
            coverage && coverage.total === 0
              ? "Ainda não há anúncios com gasto neste período."
              : "Assim que os criativos forem lidos, o placar mostra quais características vendem mais."
          }
        />
      )}

      {traits.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {traits.map((trait) => (
            <TraitCard key={trait.trait} trait={trait} currency={account.currency} />
          ))}
        </div>
      )}
    </section>
  );
};
