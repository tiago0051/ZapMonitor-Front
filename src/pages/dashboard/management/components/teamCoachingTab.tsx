import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { salesCoachService } from "@/services/api/salesCoachService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { GraduationCap, TrendingDown, TrendingUp } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { selectClassName } from "@/pages/dashboard/offers/offerUtils";

const PERIODS = [7, 30, 90];

const scoreClass = (score: number) =>
  score >= 75
    ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
    : score >= 55
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
      : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";

/**
 * Coach da equipe: cada atendimento feito por uma pessoa é analisado pela IA ao terminar. Aqui, por atendente, a nota
 * média, a tendência e o que mais se repete para melhorar e para manter, com os últimos atendimentos analisados.
 */
export const TeamCoachingTab: FC = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const [days, setDays] = useState(7);
  const reportQuery = useQuery({
    queryKey: ["salesCoach", client.id, "team", days],
    queryFn: () => salesCoachService.team(client.id, days),
  });
  const report = reportQuery.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground max-w-2xl text-sm">
          A IA analisa cada atendimento feito por uma pessoa quando ele termina: nota de 0 a 100, acertos e o que melhorar. Use para treinar
          a equipe, não para punir.
        </p>
        <select
          aria-label="Período"
          className={cn(selectClassName, "w-40")}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          {PERIODS.map((period) => (
            <option key={period} value={period}>
              Últimos {period} dias
            </option>
          ))}
        </select>
      </div>

      {reportQuery.isLoading && <LoadingState label="Carregando..." />}
      {reportQuery.isError && (
        <ErrorState
          message="Não foi possível carregar o relatório."
          onRetry={() => reportQuery.refetch()}
          isRetrying={reportQuery.isFetching}
        />
      )}
      {report && report.entries.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum atendimento analisado no período"
          description="As análises aparecem quando atendimentos feitos por pessoas terminam, com a IA ativa."
        />
      )}

      {report && report.entries.length > 0 && (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {report.entries.map((entry) => (
              <article key={entry.userId} className="space-y-2 rounded-xl border p-4">
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{entry.name}</h3>
                    <p className="text-muted-foreground text-xs">{entry.services} atendimento(s) analisado(s)</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {entry.trend !== null && entry.trend !== 0 && (
                      <span
                        className={cn("flex items-center gap-0.5 text-xs", entry.trend > 0 ? "text-green-700" : "text-red-700")}
                        title="Metade mais recente contra a mais antiga"
                      >
                        {entry.trend > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        {entry.trend > 0 ? `+${entry.trend}` : entry.trend}
                      </span>
                    )}
                    <span className={cn("rounded px-2 py-0.5 text-sm font-semibold tabular-nums", scoreClass(entry.avgScore))}>
                      {entry.avgScore}
                    </span>
                  </div>
                </header>
                {entry.topImprovements.length > 0 && (
                  <div>
                    <p className="text-xs font-medium">O que mais se repete para melhorar</p>
                    <ul className="text-muted-foreground list-disc pl-5 text-sm">
                      {entry.topImprovements.map((item) => (
                        <li key={item.text}>
                          {item.text}
                          {item.count > 1 && ` (${item.count}x)`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {entry.topStrengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium">Pontos fortes</p>
                    <ul className="text-muted-foreground list-disc pl-5 text-sm">
                      {entry.topStrengths.map((item) => (
                        <li key={item.text}>{item.text}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            ))}
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Últimos atendimentos analisados</h3>
            <ul className="divide-y rounded-xl border">
              {report.recent.map((item) => (
                <li key={item.id} className="flex flex-wrap items-start gap-3 p-3 text-sm">
                  <span className={cn("rounded px-2 py-0.5 text-xs font-semibold tabular-nums", scoreClass(item.score))}>{item.score}</span>
                  <div className="min-w-0 flex-1">
                    <p>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground"> · {format(new Date(item.createdAt), "dd/MM HH:mm")}</span>
                    </p>
                    <p className="text-muted-foreground">{item.summary}</p>
                    {item.improvements[0] && <p className="text-xs">Melhorar: {item.improvements[0]}</p>}
                  </div>
                  <Link
                    className="text-primary text-xs underline-offset-4 hover:underline"
                    to={`${baseUrl}/whatsapp?contactId=${item.whatsappContactId}`}
                  >
                    Abrir conversa
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
};
