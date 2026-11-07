import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { emailSequenceService } from "@/services/api/emailSequenceService";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Link } from "react-router";
import { formatCount } from "../broadcastUtils";

/** Sequências de e-mail com quantas pessoas estão em cada uma. */
export const EmailSequenceList = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["emailSequences", client.id, "list"],
    queryFn: () => emailSequenceService.findAll(client.id),
  });
  const items = query.data ?? [];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          E-mails espaçados que saem sozinhos para cada pessoa e param quando ela responde no WhatsApp, fecha negócio ou se descadastra.
        </p>
        {can("broadcasts.send") && (
          <Button asChild>
            <Link to={`${baseUrl}/broadcasts/sequences/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nova sequência
            </Link>
          </Button>
        )}
      </div>

      {query.isLoading && <LoadingState label="Carregando sequências..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar as sequências." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title="Nenhuma sequência ainda"
          description="Monte os e-mails, ligue a sequência e coloque as pessoas pela ficha ou por um fluxo."
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-2">
          {items.map((sequence) => (
            <Link
              key={sequence.id}
              to={`${baseUrl}/broadcasts/sequences/${sequence.id}`}
              className="hover:bg-accent/40 focus-visible:ring-ring grid gap-3 rounded-xl border p-4 outline-none focus-visible:ring-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-semibold">{sequence.name}</span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[11px] font-medium",
                      sequence.active
                        ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {sequence.active ? "Ligada" : "Desligada"}
                  </span>
                </div>
                <p className="text-muted-foreground text-xs">
                  {sequence.steps.length} {sequence.steps.length === 1 ? "e-mail" : "e-mails"}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                <div>
                  <dt className="text-muted-foreground">Em andamento</dt>
                  <dd className="font-medium">{formatCount(sequence.enrollments.active)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Terminaram</dt>
                  <dd className="font-medium">{formatCount(sequence.enrollments.completed)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saíram</dt>
                  <dd className="font-medium">{formatCount(sequence.enrollments.stopped)}</dd>
                </div>
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
