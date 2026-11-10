import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, MessagesSquare } from "lucide-react";
import { useState, type FC } from "react";
import { CountList } from "./countList";
import { NO_OBJECTION, UNKNOWN_ATTRACTION } from "./learningsUtils";

const without = (items: AdLearningCountItem[], value: string) => items.filter((item) => item.value !== value);
const countOf = (items: AdLearningCountItem[], value: string) => items.find((item) => item.value === value)?.count ?? 0;
const topLabel = (items: AdLearningCountItem[]) => [...items].sort((a, b) => b.count - a.count)[0]?.label ?? null;

const AdLearningItem: FC<{ ad: AdLearningRow }> = ({ ad }) => {
  const [isOpen, setIsOpen] = useState(false);
  const attractions = without(ad.attractions, UNKNOWN_ATTRACTION);
  const objections = without(ad.objections, NO_OBJECTION);
  const topAttraction = topLabel(attractions);
  const topObjection = topLabel(objections);

  return (
    <li className="rounded-lg border">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="hover:bg-muted/40 flex w-full items-start gap-2 rounded-lg p-3 text-left"
      >
        {isOpen ? <ChevronDown className="mt-0.5 h-4 w-4 shrink-0" /> : <ChevronRight className="mt-0.5 h-4 w-4 shrink-0" />}
        <span className="min-w-0 flex-1 space-y-1">
          <span className="block truncate text-sm font-medium">{ad.name}</span>
          <span className="text-muted-foreground block text-xs">
            {ad.deals} negócio(s) · {ad.won} ganho(s) · {ad.lost} perdido(s)
            {ad.analyzed < ad.deals && ` · ${ad.analyzed} conversa(s) analisada(s)`}
          </span>
          {(topAttraction || topObjection) && (
            <span className="block text-xs">
              {topAttraction && (
                <>
                  Atraiu por: <span className="font-medium">{topAttraction}</span>
                </>
              )}
              {topAttraction && topObjection && " · "}
              {topObjection && (
                <>
                  Objeção: <span className="font-medium">{topObjection}</span>
                </>
              )}
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3 border-t p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <CountList title="O que atraiu" items={attractions} emptyText="Não deu para saber ainda." />
            <CountList title="Objeções" items={objections} emptyText="Nenhuma objeção apareceu." barClassName="bg-amber-500" />
            <CountList
              title="Motivos de perda"
              items={ad.lostReasons}
              emptyText="Nenhum negócio perdido com motivo."
              barClassName="bg-rose-500"
            />
          </div>
          {ad.quotes.length > 0 && (
            <div className="space-y-1">
              <h5 className="text-xs font-semibold">O que os clientes disseram</h5>
              <ul className="space-y-1">
                {ad.quotes.map((quote, index) => (
                  <li key={index} className="text-muted-foreground border-l-2 pl-2 text-sm italic">
                    “{quote}”
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
};

/** O que atraiu os leads de cada anúncio, as objeções e os motivos de perda, tirados das conversas pela IA. */
export const ConversationLearnings: FC<{ account: AdAccount; days: number }> = ({ account, days }) => {
  const { client } = useClientContext();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "learnings", client.id, account.id, days],
    queryFn: () => metaAdsService.findAdLearnings(client.id, account.id, { days }),
  });
  const data = query.data;
  const totals = data?.totals;
  const noObjection = totals ? countOf(totals.objections, NO_OBJECTION) : 0;
  const unknownAttraction = totals ? countOf(totals.attractions, UNKNOWN_ATTRACTION) : 0;
  const ads = [...(data?.ads ?? [])].sort((a, b) => b.deals - a.deals);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold">O que as conversas mostram</h3>
        <p className="text-muted-foreground text-sm">
          A IA lê a conversa de cada negócio que veio de anúncio e anota o que atraiu a pessoa, qual foi a dúvida ou objeção e, quando
          perdeu, o motivo.
        </p>
      </div>

      {query.isLoading && <LoadingState />}
      {query.isError && (
        <ErrorState message="Não foi possível carregar as conversas." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}

      {totals && totals.analyzed === 0 && (
        <EmptyState
          icon={MessagesSquare}
          title="Nenhuma conversa analisada ainda"
          description={
            totals.deals > 0
              ? `Há ${totals.deals} negócio(s) de anúncio no período, mas a leitura das conversas começou agora. Os dados aparecem aqui conforme a IA analisa os próximos negócios vindos de anúncios.`
              : "Os dados aparecem aqui conforme a IA analisa os novos negócios vindos de anúncios."
          }
        />
      )}

      {totals && totals.analyzed > 0 && (
        <>
          <p className="text-muted-foreground text-xs">
            {totals.analyzed} de {totals.deals} negócio(s) de anúncio com a conversa analisada. Só negócios analisados depois desta novidade
            entram aqui.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <CountList
                title="O que mais atrai"
                items={without(totals.attractions, UNKNOWN_ATTRACTION)}
                emptyText="Não deu para saber ainda."
              />
              {unknownAttraction > 0 && (
                <p className="text-muted-foreground px-1 text-xs">Em {unknownAttraction} conversa(s) não deu para saber o que atraiu.</p>
              )}
            </div>
            <div className="space-y-1">
              <CountList
                title="Objeções mais comuns"
                items={without(totals.objections, NO_OBJECTION)}
                emptyText="Nenhuma objeção apareceu."
                barClassName="bg-amber-500"
              />
              {noObjection > 0 && <p className="text-muted-foreground px-1 text-xs">Em {noObjection} conversa(s) não houve objeção.</p>}
            </div>
            <CountList
              title="Motivos de perda"
              items={totals.lostReasons}
              emptyText="Nenhum negócio perdido com motivo."
              barClassName="bg-rose-500"
            />
          </div>

          {ads.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Por anúncio</h4>
              <ul className="space-y-2">
                {ads.map((ad) => (
                  <AdLearningItem key={ad.metaAdId} ad={ad} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};
