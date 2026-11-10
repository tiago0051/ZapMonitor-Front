import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageSquare, Users, TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { reportService } from "@/services/api/reportService";
import { memberService } from "@/services/api/memberService";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { selectClassName } from "@/pages/dashboard/broadcasts/audienceSources";

// Gráficos usam os tokens do tema para funcionar no modo escuro
const chartTooltipProps = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: 8,
    color: "var(--popover-foreground)",
  },
  labelFormatter: (day: ReactNode) => `Dia ${String(day)}`,
  cursor: { fill: "var(--muted)", opacity: 0.5 },
};
const axisTick = { fill: "var(--muted-foreground)", fontSize: 12 };
const dayAxisLabel = { value: "Dia do mês", position: "insideBottom" as const, offset: -5, fill: "var(--muted-foreground)" };

export function Reports() {
  const { client } = useClientContext();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // State para mês e ano selecionados
  const [mesSelecionado, setMesSelecionado] = useState(month);
  const [anoSelecionado, setAnoSelecionado] = useState(year);
  const [userSelected, setUserSelected] = useState<string>("");

  const usersQuery = useQuery({
    queryKey: ["members", client.id, "active-list"],
    queryFn: () =>
      memberService.findAll({
        params: { clientId: client.id },
        queries: { page: 1, take: 100, status: "ACTIVE" },
      }),
  });

  const atendentes = usersQuery.data?.items ?? [];

  // Lista de meses
  const meses = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  // Gerar lista de anos (últimos 5 anos até o ano atual)
  const anos = Array.from({ length: 5 }, (_, i) => year - i);

  // Função para verificar se um mês/ano é válido (não é futuro)
  const isMesValido = (mes: number, ano: number) => {
    if (ano < year) return true;
    if (ano === year && mes <= month) return true;
    return false;
  };

  // Handler para mudança de ano
  const handleAnoChange = (novoAno: number) => {
    setAnoSelecionado(novoAno);
    // Se o ano mudou para o ano atual e o mês selecionado é futuro, ajustar para o mês atual
    if (novoAno === year && mesSelecionado > month) {
      setMesSelecionado(month);
    }
  };

  const monthlyReportQuery = useQuery({
    queryKey: ["monthlyReport", client.id, anoSelecionado, mesSelecionado, userSelected],
    queryFn: () =>
      reportService.findMonthlyReport({
        params: { clientId: client.id },
        queries: { year: anoSelecionado, month: mesSelecionado + 1, userId: userSelected || undefined },
      }),
  });

  const dailyMessagesQuery = useQuery({
    queryKey: ["dailyMessages", client.id, anoSelecionado, mesSelecionado, userSelected],
    queryFn: () =>
      reportService.findDailyMessages({
        params: { clientId: client.id },
        queries: { year: anoSelecionado, month: mesSelecionado + 1, userId: userSelected || undefined },
      }),
  });

  const mensagensData = dailyMessagesQuery.data ?? [];
  const isLoadingDailyMessages = dailyMessagesQuery.isLoading;

  const monthlyReport = monthlyReportQuery.data;
  const isLoadingReport = monthlyReportQuery.isLoading;

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl">Dashboard de atendimentos</h1>
            <p className="text-muted-foreground">Mensagens e atendimentos do mês</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* Attendant Filter */}
            <div className="bg-card flex items-center gap-3 rounded-lg border p-4 shadow-sm">
              <Users className="text-muted-foreground shrink-0" size={20} />
              <select
                aria-label="Atendente"
                value={userSelected}
                onChange={(e) => setUserSelected(e.target.value)}
                className={cn(selectClassName, "min-w-0")}
              >
                <option value="">Todos os atendentes</option>
                {atendentes.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month and Year Selector */}
            <div className="bg-card flex items-center gap-3 rounded-lg border p-4 shadow-sm">
              <Calendar className="text-muted-foreground shrink-0" size={20} />
              <select
                aria-label="Mês"
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(Number(e.target.value))}
                className={cn(selectClassName, "min-w-0")}
              >
                {meses.map((mes, index) => (
                  <option key={index} value={index} disabled={!isMesValido(index, anoSelecionado)}>
                    {mes}
                  </option>
                ))}
              </select>
              <select
                aria-label="Ano"
                value={anoSelecionado}
                onChange={(e) => handleAnoChange(Number(e.target.value))}
                className={cn(selectClassName, "w-auto")}
              >
                {anos.map((ano) => (
                  <option key={ano} value={ano}>
                    {ano}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Sent Messages Card */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Mensagens enviadas</p>
              {isLoadingReport ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <p className="text-3xl">{formatNumber(monthlyReport?.current.totalMessagesSent)}</p>
              )}
            </div>
            <div className="rounded-lg bg-blue-100 p-3 dark:bg-blue-500/15">
              <TrendingUp className="text-blue-600" size={24} />
            </div>
          </div>
          {isLoadingReport ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className={(monthlyReport?.variation.totalMessagesSentPercentage ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(monthlyReport?.variation.totalMessagesSentPercentage)}
              </span>
              <span className="text-muted-foreground">em relação ao mês anterior</span>
            </div>
          )}
        </div>

        {/* Received Messages Card */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Mensagens recebidas</p>
              {isLoadingReport ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <p className="text-3xl">{formatNumber(monthlyReport?.current.totalMessagesReceived)}</p>
              )}
            </div>
            <div className="rounded-lg bg-green-100 p-3 dark:bg-green-500/15">
              <MessageSquare className="text-green-600" size={24} />
            </div>
          </div>
          {isLoadingReport ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className={(monthlyReport?.variation.totalMessagesReceivedPercentage ?? 0) >= 0 ? "text-green-600" : "text-red-600"}>
                {formatPercentage(monthlyReport?.variation.totalMessagesReceivedPercentage)}
              </span>
              <span className="text-muted-foreground">em relação ao mês anterior</span>
            </div>
          )}
        </div>

        {/* Services Card */}
        <div className="bg-card rounded-lg border p-6 shadow-sm">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="text-muted-foreground mb-1 text-sm">Atendimentos com atendente humano</p>
              {isLoadingReport ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <p className="text-3xl">{formatNumber(monthlyReport?.current.servicesWithHumanAttendance)}</p>
              )}
            </div>
            <div className="rounded-lg bg-purple-100 p-3 dark:bg-purple-500/15">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
          {isLoadingReport ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-600">{formatPercentage(monthlyReport?.current.humanAttendancePercentage)}</span>
              <span className="text-muted-foreground">de {formatNumber(monthlyReport?.current.totalServices)} atendimentos</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages Chart */}
      <div className="bg-card rounded-lg border p-6 shadow-sm">
        <h2 className="mb-6 text-xl">Mensagens enviadas e recebidas por dia</h2>
        {isLoadingDailyMessages ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mensagensData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={axisTick} label={dayAxisLabel} />
              <YAxis tick={axisTick} />
              <Tooltip {...chartTooltipProps} />
              <Legend />
              <Bar key="bar-enviadas" dataKey="sent" fill="#3b82f6" name="Enviadas" />
              <Bar key="bar-recebidas" dataKey="received" fill="#10b981" name="Recebidas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Combined Chart */}
      <div className="bg-card mt-6 rounded-lg border p-6 shadow-sm">
        <h2 className="mb-6 text-xl">Visão geral do mês</h2>
        {isLoadingDailyMessages ? (
          <Skeleton className="h-[400px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={mensagensData.map((msg) => ({
                id: `combined-${msg.id}`,
                day: msg.day,
                sent: msg.sent,
                received: msg.received,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={axisTick} label={dayAxisLabel} />
              <YAxis tick={axisTick} />
              <Tooltip {...chartTooltipProps} />
              <Legend />
              <Line key="line-enviadas" type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} name="Enviadas" />
              <Line key="line-recebidas" type="monotone" dataKey="received" stroke="#10b981" strokeWidth={2} name="Recebidas" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
