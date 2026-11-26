import { ErrorState, LoadingState } from "@/components/state-message";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { agencyService } from "@/services/api/agencyService";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Lightbulb, ShieldAlert } from "lucide-react";
import { useState, type FC } from "react";
import { alertTone, formatIndicator, frontInfo, indicatorChange, reportPeriodLabel } from "./agencyUtils";

type Props = { front: AgencyFront; onClose: () => void };

/** Relatório semanal de uma frente: números com a semana anterior, alertas, diagnóstico da IA gestora e histórico. */
export const FrontReportSheet: FC<Props> = ({ front, onClose }) => {
  const { client } = useClientContext();
  const info = frontInfo[front];
  const historyQuery = useQuery({
    queryKey: ["agency", client.id, "history", front],
    queryFn: () => agencyService.findReportHistory(client.id, front),
    refetchInterval: (query) => (query.state.data?.some((report) => report.status === "GENERATING") ? 4000 : false),
  });
  const reports = historyQuery.data ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const report = reports.find((item) => item.id === selectedId) ?? reports[0];

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <info.icon className="h-5 w-5" />
            {info.manager}
          </SheetTitle>
          <SheetDescription>{info.description}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-6">
          {historyQuery.isLoading ? (
            <LoadingState />
          ) : historyQuery.isError ? (
            <ErrorState message="Não foi possível carregar os relatórios" onRetry={() => historyQuery.refetch()} />
          ) : !report ? (
            <p className="text-muted-foreground text-sm">Esta frente ainda não tem relatório. Use “Gerar relatórios agora” na Agência.</p>
          ) : (
            <>
              {reports.length > 1 && (
                <div className="space-y-1.5">
                  <label htmlFor="front-report-week" className="text-sm font-medium">
                    Semana
                  </label>
                  <select
                    id="front-report-week"
                    className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    value={report.id}
                    onChange={(event) => setSelectedId(event.target.value)}
                  >
                    {reports.map((item) => (
                      <option key={item.id} value={item.id}>
                        {reportPeriodLabel(item)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <FrontReportBody report={report} />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const FrontReportBody: FC<{ report: FrontReport }> = ({ report }) => {
  if (report.status === "GENERATING") return <LoadingState label="A gestora está fechando o relatório da semana..." />;
  if (report.status === "FAILED")
    return (
      <p role="alert" className="text-destructive text-sm">
        O relatório falhou: {report.error ?? "erro desconhecido"}. Gere de novo pela Agência.
      </p>
    );

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Últimos 7 dias fechados ({reportPeriodLabel(report)}), comparados aos 7 dias anteriores.
      </p>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Números da semana</h3>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {report.indicators.map((indicator) => {
            const change = indicatorChange(indicator);
            return (
              <div key={indicator.key} className="rounded-lg border p-3">
                <dt className="text-muted-foreground text-xs">{indicator.label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{formatIndicator(indicator, indicator.value)}</dd>
                <dd className="text-muted-foreground text-xs tabular-nums">
                  antes {formatIndicator(indicator, indicator.previous)}
                  {change && (
                    <span
                      className={cn(
                        "ml-1 font-medium",
                        change.tone === "good" && "text-emerald-700 dark:text-emerald-400",
                        change.tone === "bad" && "text-destructive",
                      )}
                    >
                      {change.percent > 0 ? "+" : ""}
                      {change.percent}%
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </section>

      {report.alerts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Alertas</h3>
          <ul className="space-y-2">
            {report.alerts.map((alert) => (
              <li key={alert.title} className={cn("flex gap-2 rounded-lg border p-3 text-sm", alertTone[alert.level])}>
                {alert.level === "INFO" ? (
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>
                  <span className="font-medium">{alert.title}.</span> {alert.detail}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Diagnóstico da gestora</h3>
        {report.diagnosis ? (
          <p className="text-sm whitespace-pre-line">{report.diagnosis}</p>
        ) : (
          <p className="text-muted-foreground text-sm">{report.aiSkipped ?? "Sem diagnóstico nesta semana."}</p>
        )}
      </section>

      <InsightList title="Oportunidades para a próxima semana" icon={Lightbulb} items={report.opportunities} />
      <InsightList title="Riscos" icon={ShieldAlert} items={report.risks} />
      <FrontDetails report={report} />
    </div>
  );
};

const InsightList: FC<{ title: string; icon: typeof Lightbulb; items: FrontInsight[] }> = ({ title, icon: Icon, items }) =>
  items.length === 0 ? null : (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.title} className="flex gap-2 text-sm">
            <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-medium">{item.title}.</span> {item.detail}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );

type PlatformRow = { platform: string; spend: number; conversations: number; sales: number; costPerSale: number | null };
type TopPost = { id: string; idea: string; format: string; reach: number | null; engagement: number };
type CountRow = { label?: string; outcome?: string; total: number };

/** Detalhes que cada frente guarda além dos números: plataformas, melhores postagens, saídas dos agentes. */
const FrontDetails: FC<{ report: FrontReport }> = ({ report }) => {
  const baseUrl = useBaseUrl();
  const details = report.details ?? {};
  const capacity = report.capacity ?? {};
  const money = (value: number | null) =>
    value === null ? "—" : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

  if (report.front === "PAID") {
    const platforms = (details.platforms as PlatformRow[] | undefined) ?? [];
    const experiments = (details.experiments as { id: string; name: string }[] | undefined) ?? [];
    const fatigue = (details.fatigue as { id: string; title: string; target: string | null }[] | undefined) ?? [];
    const attendance = (details.attendance as Record<string, number> | undefined) ?? {};
    const boost = (details.boostCandidates as { id: string; idea: string; engagement: number }[] | undefined) ?? [];
    const attendanceLabel: Record<string, string> = {
      APPLIED: "aplicadas",
      PENDING_APPROVAL: "esperando aprovação",
      REJECTED: "recusadas",
      EXPIRED: "vencidas",
    };
    return (
      <section className="space-y-4">
        {platforms.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Por plataforma</h3>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-xs">
                  <tr className="text-left">
                    <th className="p-2 font-medium">Plataforma</th>
                    <th className="p-2 font-medium">Investimento</th>
                    <th className="p-2 font-medium">Conversas</th>
                    <th className="p-2 font-medium">Vendas</th>
                    <th className="p-2 font-medium">Custo por venda</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {platforms.map((row) => (
                    <tr key={row.platform} className="border-t">
                      <td className="p-2">{row.platform}</td>
                      <td className="p-2">{money(row.spend)}</td>
                      <td className="p-2">{row.conversations}</td>
                      <td className="p-2">{row.sales}</td>
                      <td className="p-2">{money(row.costPerSale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <CountList title="Testes A/B rodando" rows={experiments.map((item) => ({ label: item.name, total: 1 }))} />
        {fatigue.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Criativos cansados (sugestões do analista)</p>
            <ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-sm">
              {fatigue.map((item) => (
                <li key={item.id}>
                  {item.title}
                  {item.target && ` · ${item.target}`}
                </li>
              ))}
            </ul>
          </div>
        )}
        {Object.keys(attendance).length > 0 && (
          <p className="text-muted-foreground text-sm">
            Verba pelo ritmo do atendimento na semana:{" "}
            {Object.entries(attendance)
              .map(([status, total]) => `${total} ${attendanceLabel[status] ?? status.toLowerCase()}`)
              .join(", ")}
          </p>
        )}
        {boost.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Postagens do orgânico para impulsionar</p>
            <ul className="space-y-1 text-sm">
              {boost.map((post) => (
                <li key={post.id} className="flex justify-between gap-3">
                  <Link to={`${baseUrl}/posts/${post.id}`} className="min-w-0 truncate underline-offset-2 hover:underline">
                    {post.idea}
                  </Link>
                  <span className="text-muted-foreground shrink-0 tabular-nums">{post.engagement} interações</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  if (report.front === "ORGANIC") {
    const topPosts = (details.topPosts as TopPost[] | undefined) ?? [];
    const groupRows = (key: string) =>
      ((details[key] as { name: string; posts: number; engagementPerPost: number }[] | undefined) ?? []).map((row) => ({
        label: `${row.name} (${row.posts})`,
        total: row.engagementPerPost,
      }));
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Agenda e melhores postagens</h3>
        <p className="text-muted-foreground text-sm">
          {String(capacity.scheduledNextWeek ?? 0)} postagem(ns) para os próximos 7 dias · {String(capacity.pendingApprovals ?? 0)}{" "}
          esperando aprovação
          {typeof capacity.weeklyArts === "number"
            ? ` · ${typeof capacity.artsUsed === "number" ? `${capacity.artsUsed} de ` : ""}${capacity.weeklyArts} arte(s) da semana`
            : ""}
        </p>
        <CountList title="Engajamento por postagem, por pilar" rows={groupRows("byPillar")} />
        <CountList title="Engajamento por postagem, por formato" rows={groupRows("byFormat")} />
        {topPosts.length > 0 && (
          <ul className="space-y-1 text-sm">
            {topPosts.map((post) => (
              <li key={post.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{post.idea}</span>
                <span className="text-muted-foreground shrink-0 tabular-nums">{post.engagement} interações</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  const agentOutcomes = (details.agentOutcomes as CountRow[] | undefined) ?? [];
  const closeOutcomes = (details.closeOutcomes as CountRow[] | undefined) ?? [];
  const agentFlows = (details.agentFlows as { flowId: string; flow: string; total: number; outputs: CountRow[] }[] | undefined) ?? [];
  const objections = (details.objections as CountRow[] | undefined) ?? [];
  const lostReasons = (details.lostReasons as CountRow[] | undefined) ?? [];
  const numbers =
    (details.numbers as
      | { id: string; phoneNumber: string; qualityRating: string | null; messagingLimitTier: string | null; paymentIssue: boolean }[]
      | undefined) ?? [];
  const qualityLabel: Record<string, string> = { GREEN: "verde", YELLOW: "amarela", RED: "vermelha" };
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Capacidade e resultados das conversas</h3>
      <p className="text-muted-foreground text-sm">
        {String(capacity.queueWaiting ?? 0)} contato(s) na fila agora · {String(capacity.activeAttendants ?? 0)} pessoa(s) atenderam na
        semana
        {typeof capacity.dailyCapacity === "number" && ` · até ${capacity.dailyCapacity} atendimento(s) num dia`}
      </p>
      {numbers.length > 0 && (
        <ul className="space-y-0.5 text-sm">
          {numbers.map((number) => (
            <li key={number.id} className="flex flex-wrap justify-between gap-2">
              <span>{number.phoneNumber}</span>
              <span className={cn("text-muted-foreground", (number.paymentIssue || number.qualityRating === "RED") && "text-destructive")}>
                qualidade {number.qualityRating ? (qualityLabel[number.qualityRating] ?? number.qualityRating) : "—"}
                {number.messagingLimitTier && ` · ${number.messagingLimitTier.replace("TIER_", "")} conversas/24h`}
                {number.paymentIssue && " · pagamento com problema"}
              </span>
            </li>
          ))}
        </ul>
      )}
      {agentFlows.length > 0 ? (
        agentFlows.map((flow) => (
          <CountList
            key={flow.flowId}
            title={`Agente de IA · ${flow.flow}`}
            rows={flow.outputs.map((row) => ({ label: row.label ?? "", total: row.total }))}
          />
        ))
      ) : (
        <CountList title="Saídas dos agentes de IA" rows={agentOutcomes.map((row) => ({ label: row.label ?? "", total: row.total }))} />
      )}
      <CountList
        title="Objeções nas passagens para a equipe"
        rows={objections.map((row) => ({ label: row.label ?? "", total: row.total }))}
      />
      <CountList title="Motivos de perda" rows={lostReasons.map((row) => ({ label: row.label ?? "", total: row.total }))} />
      <CountList title="Resultados ao encerrar" rows={closeOutcomes.map((row) => ({ label: row.outcome ?? "", total: row.total }))} />
    </section>
  );
};

const CountList: FC<{ title: string; rows: { label: string; total: number }[] }> = ({ title, rows }) =>
  rows.length === 0 ? null : (
    <div className="space-y-1">
      <p className="text-xs font-medium">{title}</p>
      <ul className="space-y-0.5 text-sm">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{row.label}</span>
            <span className="text-muted-foreground shrink-0 tabular-nums">{row.total}</span>
          </li>
        ))}
      </ul>
    </div>
  );
