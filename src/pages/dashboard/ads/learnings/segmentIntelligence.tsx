import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Lock, Users } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { formatPercent, formatShare, LOSER_INDEX, WINNER_INDEX } from "./learningsUtils";

const OBJECTION_TRAIT = "objection";

const insightTag = (value: number) => {
  if (value >= WINNER_INDEX) return { label: "Funciona", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" };
  if (value <= LOSER_INDEX) return { label: "Vende menos", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" };
  return { label: "Na média", className: "bg-muted text-muted-foreground" };
};

const InsightGroup: FC<{ label: string; insights: AdSegmentInsight[] }> = ({ label, insights }) => {
  const isObjection = insights[0]?.trait === OBJECTION_TRAIT;
  const sorted = [...insights].sort((a, b) => b.salesIndex - a.salesIndex);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <h4 className="text-sm font-semibold">{isObjection ? "Objeções mais comuns no segmento" : label}</h4>
      <ul className="space-y-2">
        {sorted.map((insight) => {
          const tag = insightTag(insight.salesIndex);
          return (
            <li key={insight.value} className="flex items-start justify-between gap-2">
              <span className="min-w-0">
                <span className="block text-sm">{insight.valueLabel}</span>
                <span className="text-muted-foreground block text-xs">
                  {isObjection
                    ? `aparece em ${formatPercent(insight.salesIndex)} dos negócios`
                    : `vende ${formatShare(insight.salesIndex)} a sua parte da verba`}{" "}
                  · {insight.clients} clientes
                </span>
              </span>
              {!isObjection && (
                <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap", tag.className)}>
                  {tag.label}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

/** O que vende entre os clientes do mesmo ramo, em números somados (nunca de um cliente só). */
export const SegmentIntelligence: FC = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const queryKey = ["metaAds", "segmentIntelligence", client.id];

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey,
    queryFn: () => metaAdsService.findSegmentIntelligence(client.id),
  });

  const save = useMutation({
    mutationFn: (optOut: boolean) => metaAdsService.saveIntelligenceSettings(client.id, { optOut }),
    onError: requestErrorHandling,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKey, data);
      toast.success(data.optOut ? "Você saiu da inteligência compartilhada" : "Você voltou a participar da inteligência compartilhada");
    },
  });

  const data = query.data;

  const onToggle = async (participate: boolean) => {
    if (!participate) {
      const ok = await confirm({
        title: "Sair da inteligência compartilhada?",
        description:
          "Os números dos seus anúncios deixam de entrar na soma do seu segmento e você deixa de ver o que funciona para os outros clientes do mesmo ramo. Dá para voltar quando quiser.",
        confirmLabel: "Sair",
        destructive: true,
      });
      if (!ok) return;
    }
    save.mutate(!participate);
  };

  const groups = new Map<string, AdSegmentInsight[]>();
  for (const insight of data?.insights ?? []) groups.set(insight.label, [...(groups.get(insight.label) ?? []), insight]);
  // Objeções por último, depois das características do criativo
  const orderedGroups = [...groups.entries()].sort(
    ([, a], [, b]) => Number(a[0]?.trait === OBJECTION_TRAIT) - Number(b[0]?.trait === OBJECTION_TRAIT),
  );

  return (
    <section className="space-y-3">
      {confirmDialog}
      <div>
        <h3 className="text-base font-semibold">Inteligência do ZapMonitor no seu segmento</h3>
        <p className="text-muted-foreground text-sm">
          O que está vendendo para outros clientes do mesmo ramo, para você aproveitar nos seus anúncios.
        </p>
      </div>

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Não foi possível carregar o seu segmento." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}

      {data && !data.segment && (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          O segmento da sua empresa ainda não foi definido. A equipe do ZapMonitor cuida disso e, assim que estiver definido, esta área
          mostra o que funciona para negócios do mesmo ramo. Você não precisa fazer nada.
        </p>
      )}

      {data && data.segment && (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
            <Users className="text-primary h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                Seu segmento: <span className="font-medium">{data.segmentLabel ?? data.segment}</span>
              </p>
              {!data.optOut && data.computedAt && (
                <p className="text-muted-foreground text-xs">Atualizado em {format(new Date(data.computedAt), "dd/MM/yyyy")}</p>
              )}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={!data.optOut}
                disabled={!can("ads.manage") || save.isPending}
                onCheckedChange={(checked) => onToggle(checked)}
              />
              Participar da inteligência compartilhada
            </label>
          </div>

          {data.optOut ? (
            <p className="text-muted-foreground rounded-lg border p-3 text-sm">
              Você escolheu não compartilhar os números dos seus anúncios, por isso também não vê o que funciona para os outros clientes do
              segmento.
              {can("ads.manage") ? " Ligue a opção acima para voltar a participar." : " Peça a um administrador para voltar a participar."}
            </p>
          ) : (
            <>
              <p className="text-muted-foreground flex items-start gap-1.5 text-xs">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Os números são a soma de vários clientes e só aparecem quando há clientes suficientes. Nenhum cliente é mostrado sozinho.
              </p>
              {orderedGroups.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border p-3 text-sm">
                  Ainda não há clientes suficientes com vendas no seu segmento para mostrar resultados. Volte em alguns dias.
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {orderedGroups.map(([label, insights]) => (
                    <InsightGroup key={label} label={label} insights={insights} />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
};
