import { ErrorState } from "@/components/state-message";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils";
import { managementService } from "@/services/api/managementService";
import { useQuery } from "@tanstack/react-query";
import { Hourglass, Users } from "lucide-react";

const REFRESH_INTERVAL_MS = 30 * 1000;
// Acima disso a espera aparece em vermelho
const LONG_WAIT_MS = 15 * 60 * 1000;

const formatWait = (from: string | null, now: number) => {
  if (!from) return "—";
  const minutes = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60_000));
  if (minutes < 1) return "menos de 1 min";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 ? `${hours}h ${minutes % 60}min` : `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
};

/** Fila agora: quantos esperam em cada grupo e há quanto tempo o primeiro espera. */
export const QueueNow = () => {
  const { client } = useClientContext();
  const now = useNow();

  const queueQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["management", "queue", client.id],
    queryFn: () => managementService.findQueue({ params: { clientId: client.id } }),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  if (queueQuery.isLoading) return <Skeleton className="h-28 w-full rounded-xl" />;
  if (queueQuery.isError)
    return (
      <ErrorState
        message="Não foi possível buscar a fila."
        onRetry={() => queueQuery.refetch()}
        isRetrying={queueQuery.isFetching}
        className="rounded-xl border"
      />
    );

  const queue = queueQuery.data!;
  const isLongWait = (from: string | null) => !!from && now - new Date(from).getTime() > LONG_WAIT_MS;

  return (
    <section className="bg-card rounded-xl border p-4 shadow-xs" aria-label="Fila agora">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Fila agora</h2>
        <p className="text-muted-foreground text-sm">
          {queue.total === 0 ? (
            "Ninguém esperando atendimento"
          ) : (
            <>
              <span className="text-foreground font-semibold tabular-nums">{queue.total}</span> esperando · maior espera{" "}
              <span
                className={cn("font-semibold tabular-nums", isLongWait(queue.oldestQueueEnteredAt) ? "text-red-600" : "text-foreground")}
              >
                {formatWait(queue.oldestQueueEnteredAt, now)}
              </span>
            </>
          )}
        </p>
      </div>

      {queue.groups.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {queue.groups.map((group) => (
            <li key={group.serviceGroupId ?? "none"} className="bg-muted/40 flex items-center gap-3 rounded-lg border px-3 py-2">
              <Users className="text-muted-foreground h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{group.name ?? "Sem grupo"}</p>
                <p className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Hourglass className="h-3 w-3" />
                  {group.waiting > 0 ? (
                    <span className={cn(isLongWait(group.oldestQueueEnteredAt) && "font-medium text-red-600")}>
                      maior espera {formatWait(group.oldestQueueEnteredAt, now)}
                    </span>
                  ) : (
                    "sem espera"
                  )}
                </p>
              </div>
              <span className={cn("text-xl font-semibold tabular-nums", group.waiting === 0 && "text-muted-foreground")}>
                {group.waiting}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
