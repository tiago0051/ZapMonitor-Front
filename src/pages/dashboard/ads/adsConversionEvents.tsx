import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { conversionEventLabel, formatCurrency } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInDays, format } from "date-fns";
import { RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { conversionChannelLabel, conversionStatusInfo } from "./adsUtils";

// A Meta recusa eventos com mais de 7 dias
const MAX_EVENT_AGE_DAYS = 7;

/** Registro dos eventos mandados à Meta, com a resposta de cada um. */
export const AdsConversionEvents = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();

  const eventsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "conversionEvents", client.id],
    queryFn: () => metaAdsService.findConversionEvents({ params: { clientId: client.id } }),
    refetchInterval: (query) => (query.state.data?.some((event) => event.status === "PENDING") ? 5000 : false),
  });

  const retry = useMutation({
    mutationFn: metaAdsService.retryConversionEvent,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "conversionEvents"] });
      toast.success("Evento enviado de novo para a fila");
    },
  });

  const retryAll = useMutation({
    mutationFn: metaAdsService.retryFailedConversionEvents,
    onError: requestErrorHandling,
    onSuccess: ({ queued, expired }) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "conversionEvents"] });
      const expiredNote = expired > 0 ? ` ${expired} com mais de 7 dias não podem mais ser enviados.` : "";
      if (queued > 0) toast.success(`${queued} evento(s) enviados de novo para a fila.${expiredNote}`);
      else toast.info(`Nenhum evento com falha dos últimos 7 dias.${expiredNote}`);
    },
  });

  if (eventsQuery.isLoading) return <LoadingState />;
  if (eventsQuery.isError)
    return (
      <ErrorState
        message="Não foi possível carregar os eventos."
        onRetry={() => eventsQuery.refetch()}
        isRetrying={eventsQuery.isFetching}
      />
    );

  const events = eventsQuery.data ?? [];
  if (events.length === 0)
    return (
      <EmptyState
        icon={Send}
        title="Nenhum evento mandado à Meta"
        description="Ligue os eventos de conversão em Configurações → Anúncios da Meta. Só negócios vindos de anúncio geram eventos."
      />
    );

  const retryable = events.filter(
    (event) =>
      (event.status === "FAILED" || event.status === "SKIPPED") &&
      differenceInDays(new Date(), new Date(event.eventTime)) < MAX_EVENT_AGE_DAYS,
  ).length;

  return (
    <div className="space-y-3">
      {can("ads.manage") && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <p className="text-muted-foreground text-xs">Reenvia os eventos que falharam ou foram pulados nos últimos 7 dias.</p>
          <Button
            size="sm"
            variant="outline"
            disabled={retryAll.isPending || retryable === 0}
            onClick={() => retryAll.mutate({ params: { clientId: client.id } })}
          >
            <RotateCcw className="h-4 w-4" />
            Reenviar todos com falha{retryable > 0 && ` (${retryable})`}
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quando</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Negócio</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => {
              const status = conversionStatusInfo[event.status];
              const canRetry =
                can("ads.manage") &&
                (event.status === "FAILED" || event.status === "SKIPPED") &&
                differenceInDays(new Date(), new Date(event.eventTime)) < MAX_EVENT_AGE_DAYS;

              return (
                <TableRow key={event.id}>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(event.eventTime), "dd/MM HH:mm")}</TableCell>
                  <TableCell className="text-sm">{conversionEventLabel[event.eventName]}</TableCell>
                  <TableCell className="text-sm">{event.dealTitle ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {event.channel ? conversionChannelLabel[event.channel] : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {event.value === null ? "—" : formatCurrency(event.value)}
                  </TableCell>
                  <TableCell>
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", status.className)}>
                      {status.label}
                    </span>
                    {event.error && event.status !== "SENT" && <p className="text-muted-foreground mt-1 max-w-72 text-xs whitespace-normal">{event.error}</p>}
                    {event.status === "SENT" && event.sentAt && (
                      <p className="text-muted-foreground mt-1 text-xs" title={`event_id ${event.eventId}`}>
                        em {format(new Date(event.sentAt), "dd/MM HH:mm")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canRetry && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={retry.isPending}
                        onClick={() => retry.mutate({ params: { clientId: client.id, eventId: event.id } })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Mandar de novo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
