import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { MessageSquare, Users, TrendingUp, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercentage } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { reportService } from "@/services/api/reportService";
import { useState } from "react";

export function Reports() {
  const { client } = useClientContext();

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // State para mês e ano selecionados
  const [mesSelecionado, setMesSelecionado] = useState(month);
  const [anoSelecionado, setAnoSelecionado] = useState(year);

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
    queryKey: ["monthlyReport", client.id, anoSelecionado, mesSelecionado],
    queryFn: () => reportService.findMonthlyReport(client.id, anoSelecionado, mesSelecionado + 1),
  });

  const dailyMessagesQuery = useQuery({
    queryKey: ["dailyMessages", client.id, anoSelecionado, mesSelecionado],
    queryFn: () => reportService.findDailyMessages(client.id, anoSelecionado, mesSelecionado + 1),
  });

  const mensagensData = dailyMessagesQuery.data ?? [];
  const isLoadingDailyMessages = dailyMessagesQuery.isLoading;

  const monthlyReport = monthlyReportQuery.data;
  const isLoadingReport = monthlyReportQuery.isLoading;

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="mb-2 text-3xl">Dashboard de Atendimento</h1>
            <p className="text-gray-600">Visualização de mensagens e contatos do mês</p>
          </div>

          {/* Seletor de Mês e Ano */}
          <div className="flex items-center gap-3 rounded-lg bg-white p-4 shadow">
            <Calendar className="text-gray-600" size={20} />
            <select
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {meses.map((mes, index) => (
                <option key={index} value={index} disabled={!isMesValido(index, anoSelecionado)}>
                  {mes}
                </option>
              ))}
            </select>
            <select
              value={anoSelecionado}
              onChange={(e) => handleAnoChange(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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

      {/* Cards de Resumo */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Card Mensagens Enviadas */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Mensagens Enviadas</p>
              {isLoadingReport ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <p className="text-3xl">{formatNumber(monthlyReport?.current.totalMessagesSent)}</p>
              )}
            </div>
            <div className="rounded-lg bg-blue-100 p-3">
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
              <span className="text-gray-600">vs. mês anterior</span>
            </div>
          )}
        </div>

        {/* Card Mensagens Recebidas */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Mensagens Recebidas</p>
              {isLoadingReport ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <p className="text-3xl">{formatNumber(monthlyReport?.current.totalMessagesReceived)}</p>
              )}
            </div>
            <div className="rounded-lg bg-green-100 p-3">
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
              <span className="text-gray-600">vs. mês anterior</span>
            </div>
          )}
        </div>

        {/* Card Atendimentos */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="mb-1 text-sm text-gray-600">Atendimentos Humanos</p>
              {isLoadingReport ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <p className="text-3xl">{formatNumber(monthlyReport?.current.servicesWithHumanAttendance)}</p>
              )}
            </div>
            <div className="rounded-lg bg-purple-100 p-3">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
          {isLoadingReport ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-600">{formatPercentage(monthlyReport?.current.humanAttendancePercentage)}</span>
              <span className="text-gray-600">de {formatNumber(monthlyReport?.current.totalServices)} atendimentos</span>
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de Mensagens */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-6 text-xl">Mensagens Enviadas vs Recebidas</h2>
        {isLoadingDailyMessages ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={mensagensData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" label={{ value: "Dia do Mês", position: "insideBottom", offset: -5 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar key="bar-enviadas" dataKey="sent" fill="#3b82f6" name="Enviadas" />
              <Bar key="bar-recebidas" dataKey="received" fill="#10b981" name="Recebidas" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Gráfico Combinado */}
      <div className="mt-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-6 text-xl">Visão Geral do Mês</h2>
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" label={{ value: "Dia do Mês", position: "insideBottom", offset: -5 }} />
              <YAxis />
              <Tooltip />
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
