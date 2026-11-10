import { ErrorState, LoadingState } from "@/components/state-message";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { FC } from "react";
import { formatCount, formatMoney } from "../adsUtils";
import { MetricHelp } from "../components/metricHelp";

const verdictInfo: Record<AdAudienceLiftVerdict, { label: string; className: string }> = {
  LEARNING: { label: "Aprendendo", className: "bg-muted text-muted-foreground" },
  POSITIVE: { label: "O anúncio traz vendas", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  NO_EFFECT: { label: "Sem efeito", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  UNCLEAR: { label: "Ainda incerto", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
};

const formatRate = (rate: number | null) =>
  rate === null ? "—" : `${(rate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const GroupColumn: FC<{ title: string; group: AdAudienceLiftGroup }> = ({ title, group }) => (
  <div className="space-y-1 rounded-md border p-3">
    <p className="text-xs font-medium">{title}</p>
    <p className="text-2xl font-semibold tabular-nums">{formatRate(group.rate)}</p>
    <p className="text-muted-foreground text-xs">compraram</p>
    <dl className="grid grid-cols-2 gap-x-2 pt-1 text-xs">
      <dt className="text-muted-foreground">Pessoas</dt>
      <dd className="text-right tabular-nums">{formatCount(group.members)}</dd>
      <dt className="text-muted-foreground">Compras</dt>
      <dd className="text-right tabular-nums">{formatCount(group.conversions)}</dd>
    </dl>
  </div>
);

type Props = { account: AdAccount; audience: AdCrmAudience | null; onOpenChange: (open: boolean) => void };

/** Resultado do grupo de controle: quanto compra quem recebeu o anúncio contra quem foi sorteado para não receber. */
export const AudienceLiftDialog: FC<Props> = ({ account, audience, onOpenChange }) => {
  const { client } = useClientContext();
  const liftQuery = useQuery({
    queryKey: ["metaAds", "crmAudienceLift", client.id, account.id, audience?.id],
    queryFn: () => metaAdsService.findCrmAudienceLift({ params: { clientId: client.id, accountId: account.id, audienceId: audience!.id } }),
    enabled: !!audience,
  });
  const lift = liftQuery.data;
  const verdict = lift ? verdictInfo[lift.verdict] : null;

  return (
    <Dialog open={!!audience} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Vendas que o anúncio trouxe</DialogTitle>
          <DialogDescription>
            {audience?.name}
            {audience?.controlStartedAt && ` · medindo desde ${format(new Date(audience.controlStartedAt), "dd/MM/yyyy")}`}
          </DialogDescription>
        </DialogHeader>
        {liftQuery.isLoading ? (
          <LoadingState />
        ) : liftQuery.isError || !lift ? (
          <ErrorState
            message="Não foi possível carregar o resultado"
            onRetry={() => liftQuery.refetch()}
            isRetrying={liftQuery.isFetching}
          />
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <GroupColumn title="Receberam o anúncio" group={lift.treated} />
              <GroupColumn title="Grupo de controle" group={lift.control} />
            </div>
            <div className="space-y-1.5">
              {verdict && (
                <span className={cn("inline-block rounded px-1.5 py-0.5 text-xs font-medium", verdict.className)}>{verdict.label}</span>
              )}
              <p className="text-sm">{lift.explanation}</p>
            </div>
            <dl className="grid gap-1.5 rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground flex items-center gap-1">
                  Vendas a mais por causa do anúncio
                  <MetricHelp term="INCREMENTAL_SALES" />
                </dt>
                <dd className="font-medium tabular-nums">{formatCount(lift.incrementalSales, 1)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Gasto no período</dt>
                <dd className="tabular-nums">{formatMoney(lift.spend, account.currency)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">Custo por venda a mais</dt>
                <dd className="tabular-nums">{formatMoney(lift.costPerIncrementalSale, account.currency)}</dd>
              </div>
            </dl>
            <p className="text-muted-foreground text-xs">
              O grupo de controle é uma parte sorteada do público que não recebe o anúncio. Quanto mais pessoas e compras, mais confiável
              fica a comparação.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
