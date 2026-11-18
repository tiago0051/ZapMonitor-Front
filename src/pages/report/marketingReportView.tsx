import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FC } from "react";

const platformLabel: Record<string, string> = { META: "Meta (Facebook e Instagram)", GOOGLE_ADS: "YouTube", TIKTOK_ADS: "TikTok" };

const money = (value: number | null, currency: string | null) =>
  value === null
    ? "—"
    : value.toLocaleString("pt-BR", currency ? { style: "currency", currency } : { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const count = (value: number | null) => (value === null ? "—" : value.toLocaleString("pt-BR"));

const Stat: FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-lg border p-3">
    <p className="text-muted-foreground text-xs">{label}</p>
    <p className="text-xl font-semibold tabular-nums">{value}</p>
    {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
  </div>
);

/** Corpo do relatório do mês: o mesmo na página pública e na prévia dentro do painel. */
export const MarketingReportView: FC<{ data: MarketingReportData }> = ({ data }) => {
  const ads = data.ads;
  const currency = ads?.currency ?? null;
  const monthLabel = format(new Date(`${data.month}-01T12:00`), "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <article className="grid gap-6">
      <header className="grid gap-1">
        <p className="text-muted-foreground text-sm">Relatório de marketing</p>
        <h1 className="text-2xl font-semibold">
          {data.clientName} · <span className="capitalize">{monthLabel}</span>
        </h1>
        <p className="text-muted-foreground text-xs">Números de {format(new Date(data.generatedAt), "dd/MM/yyyy 'às' HH:mm")}</p>
      </header>

      <section className="grid gap-3" aria-labelledby="report-ads">
        <h2 id="report-ads" className="font-semibold">
          Anúncios
        </h2>
        {ads ? (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="Investido" value={money(ads.spend, currency)} />
              <Stat label="Conversas" value={count(ads.conversations)} hint={`${money(ads.costPerConversation, currency)} por conversa`} />
              <Stat label="Vendas no CRM" value={count(ads.sales)} hint={`${money(ads.salesValue, currency)} vendidos`} />
              <Stat label="Custo por venda" value={money(ads.costPerSale, currency)} />
              <Stat label="Reuniões" value={count(ads.meetings)} hint={`${money(ads.costPerMeeting, currency)} por reunião`} />
              <Stat label="Negócios abertos" value={count(ads.deals)} />
            </div>
            {!currency && <p className="text-muted-foreground text-xs">As contas usam moedas diferentes; os totais somam os valores.</p>}
            {data.platforms.length > 1 && (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs">
                    <tr>
                      <th className="p-2 font-medium">Plataforma</th>
                      <th className="p-2 text-right font-medium">Investido</th>
                      <th className="p-2 text-right font-medium">Conversas</th>
                      <th className="p-2 text-right font-medium">Vendas</th>
                      <th className="p-2 text-right font-medium">Custo por venda</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.platforms.map((row) => (
                      <tr key={row.platform} className="border-t">
                        <td className="p-2">{platformLabel[row.platform] ?? row.platform}</td>
                        <td className="p-2 text-right tabular-nums">{money(row.spend, row.currency)}</td>
                        <td className="p-2 text-right tabular-nums">{count(row.conversations)}</td>
                        <td className="p-2 text-right tabular-nums">{count(row.sales)}</td>
                        <td className="p-2 text-right tabular-nums">{money(row.costPerSale, row.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma conta de anúncio ligada neste mês.</p>
        )}
      </section>

      {data.organic && (
        <section className="grid gap-3" aria-labelledby="report-organic">
          <h2 id="report-organic" className="font-semibold">
            Postagens (sem verba)
          </h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <Stat label="Postagens publicadas" value={count(data.organic.posts)} />
            <Stat label="Pessoas alcançadas" value={count(data.organic.reach)} />
            <Stat label="Engajamento" value={count(data.organic.engagement)} hint="Curtidas, comentários, compartilhamentos e salvos" />
          </div>
        </section>
      )}

      <section className="grid gap-2" aria-labelledby="report-ai">
        <h2 id="report-ai" className="font-semibold">
          O que a IA mudou
        </h2>
        {data.aiChanges.length ? (
          <ul className="grid gap-2">
            {data.aiChanges.map((change, index) => (
              <li key={index} className="rounded-lg border p-3 text-sm">
                <p>
                  <span className="text-muted-foreground tabular-nums">{format(new Date(change.date), "dd/MM")} · </span>
                  {change.description}
                </p>
                {change.reason && <p className="text-muted-foreground text-xs">{change.reason}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhuma mudança aplicada pela IA neste mês.</p>
        )}
      </section>

      <section className="grid gap-2" aria-labelledby="report-next">
        <h2 id="report-next" className="font-semibold">
          Próximos passos
        </h2>
        {data.nextSteps.length ? (
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            {data.nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">Sem pendências abertas.</p>
        )}
      </section>
    </article>
  );
};
