import { ErrorState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { managementService } from "@/services/api/managementService";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AttendedServicesList } from "./attendedServicesList";
import { thisMonthPeriod, toPeriodQuery, type Period } from "./period";
import { PeriodFilter } from "./periodFilter";

export const AttendedTab = () => {
  const { client } = useClientContext();

  const [period, setPeriod] = useState<Period>(thisMonthPeriod);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Abaixo de lg o detalhe fica embaixo da lista: leva a pessoa até ele
  const selectAttendant = (userId: string) => {
    setSelectedUserId(userId);
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }));
  };

  const periodQuery = toPeriodQuery(period);

  const findSummaryQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["management", "attended", client.id, periodQuery],
    queryFn: () => managementService.findAttendedSummary({ params: { clientId: client.id }, queries: periodQuery! }),
    enabled: !!periodQuery,
  });

  const attendants = findSummaryQuery.data ?? [];
  const total = attendants.reduce((sum, attendant) => sum + attendant.total, 0);
  const selectedAttendant = attendants.find((attendant) => attendant.userId === selectedUserId) ?? null;

  return (
    <div className="space-y-4">
      <PeriodFilter period={period} onChange={setPeriod} idPrefix="attended-period" />

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
          {findSummaryQuery.isError && (
            <ErrorState
              message="Não foi possível buscar os atendimentos."
              onRetry={() => findSummaryQuery.refetch()}
              isRetrying={findSummaryQuery.isFetching}
            />
          )}

          <ul className="divide-y">
            {attendants.map((attendant) => (
              <li key={attendant.userId}>
                <button
                  type="button"
                  onClick={() => selectAttendant(attendant.userId)}
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

        <div ref={detailRef} className="bg-card min-w-0 flex-1 scroll-mt-4 rounded-xl border shadow-xs">
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
