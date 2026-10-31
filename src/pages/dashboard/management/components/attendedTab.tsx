import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { managementService } from "@/services/api/managementService";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, endOfMonth, format, parseISO, startOfDay, startOfMonth, subDays, subMonths } from "date-fns";
import { useState } from "react";
import { AttendedServicesList } from "./attendedServicesList";

type Period = { start: string; end: string };

const toInputDate = (date: Date) => format(date, "yyyy-MM-dd");

const presets: { label: string; build: () => Period }[] = [
  { label: "Hoje", build: () => ({ start: toInputDate(new Date()), end: toInputDate(new Date()) }) },
  { label: "Últimos 7 dias", build: () => ({ start: toInputDate(subDays(new Date(), 6)), end: toInputDate(new Date()) }) },
  { label: "Este mês", build: () => ({ start: toInputDate(startOfMonth(new Date())), end: toInputDate(new Date()) }) },
  {
    label: "Mês passado",
    build: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: toInputDate(startOfMonth(lastMonth)), end: toInputDate(endOfMonth(lastMonth)) };
    },
  },
];

export const AttendedTab = () => {
  const { client } = useClientContext();

  const [period, setPeriod] = useState<Period>(presets[2].build());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const isValidPeriod = !!period.start && !!period.end && period.start <= period.end;
  // O dia inteiro no fuso do navegador
  const periodQuery = isValidPeriod
    ? { startDate: startOfDay(parseISO(period.start)).toISOString(), endDate: endOfDay(parseISO(period.end)).toISOString() }
    : null;

  const findSummaryQuery = useQuery({
    queryKey: ["management", "attended", client.id, periodQuery],
    queryFn: () => managementService.findAttendedSummary({ params: { clientId: client.id }, queries: periodQuery! }),
    enabled: !!periodQuery,
  });

  const attendants = findSummaryQuery.data ?? [];
  const total = attendants.reduce((sum, attendant) => sum + attendant.total, 0);
  const selectedAttendant = attendants.find((attendant) => attendant.userId === selectedUserId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="period-start">De</Label>
          <Input
            id="period-start"
            type="date"
            value={period.start}
            max={period.end}
            onChange={(e) => setPeriod({ ...period, start: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="period-end">Até</Label>
          <Input
            id="period-end"
            type="date"
            value={period.end}
            min={period.start}
            onChange={(e) => setPeriod({ ...period, end: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <Button key={preset.label} variant="outline" size="sm" onClick={() => setPeriod(preset.build())}>
              {preset.label}
            </Button>
          ))}
        </div>
      </div>

      {!isValidPeriod && <p className="text-destructive text-sm">Escolha um período em que o início seja antes do fim.</p>}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="bg-card rounded-xl border shadow-xs lg:w-80 lg:shrink-0">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-sm font-semibold">Colaboradores</p>
            <Badge variant="outline">{total} atendimento(s)</Badge>
          </div>

          {findSummaryQuery.isLoading && (
            <div className="space-y-2 p-4">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          )}
          {findSummaryQuery.isError && <p className="text-destructive p-4 text-sm">Erro ao buscar os atendimentos.</p>}

          <ul className="divide-y">
            {attendants.map((attendant) => (
              <li key={attendant.userId}>
                <button
                  onClick={() => setSelectedUserId(attendant.userId)}
                  aria-current={attendant.userId === selectedUserId ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors",
                    attendant.userId === selectedUserId ? "bg-muted" : "hover:bg-muted/60",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{attendant.name}</span>
                    {!attendant.active && <span className="text-muted-foreground text-xs">Desativado</span>}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{attendant.total}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card min-w-0 flex-1 rounded-xl border shadow-xs">
          {!selectedAttendant && (
            <p className="text-muted-foreground p-6 text-sm">Selecione um colaborador para ver quem ele atendeu no período.</p>
          )}
          {selectedAttendant && periodQuery && (
            <AttendedServicesList
              key={`${selectedAttendant.userId}-${periodQuery.startDate}-${periodQuery.endDate}`}
              attendant={selectedAttendant}
              period={periodQuery}
            />
          )}
        </div>
      </div>
    </div>
  );
};
