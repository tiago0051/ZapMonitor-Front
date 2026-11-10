import { cn } from "@/lib/utils";
import { ownerService } from "@/services/api/ownerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { toast } from "sonner";

const WITHOUT_SEGMENT = "";

type ClientsPage = PaginatedResponse<OwnerClient>;

/** Segmento da inteligência de anúncios do tenant; salva ao escolher, já mostrando a troca antes da resposta. */
export const ClientAdSegmentSelect: FC<{ client: OwnerClient; className?: string }> = ({ client, className }) => {
  const queryClient = useQueryClient();

  const segmentsQuery = useQuery({
    queryKey: ["owner", "adSegments"],
    queryFn: ownerService.findAdSegments,
    staleTime: Infinity,
  });

  const setSegmentInCache = (segment: string | null) =>
    queryClient.setQueriesData<ClientsPage>({ queryKey: ["owner", "clients"] }, (page) =>
      page ? { ...page, items: page.items.map((item) => (item.id === client.id ? { ...item, adSegment: segment } : item)) } : page,
    );

  const changeSegment = useMutation({
    mutationFn: (segment: string | null) => ownerService.changeClientAdSegment({ params: { clientId: client.id }, body: { segment } }),
    onMutate: async (segment) => {
      await queryClient.cancelQueries({ queryKey: ["owner", "clients"] });
      const previous = client.adSegment;
      setSegmentInCache(segment);
      return { previous };
    },
    onError: (error, _segment, context) => {
      setSegmentInCache(context?.previous ?? null);
      requestErrorHandling(error);
    },
    onSuccess: () => toast.success(`Segmento de ${client.name} salvo`),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["owner", "clients"] }),
  });

  const segments = segmentsQuery.data ?? [];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        aria-label={`Segmento de ${client.name}`}
        value={client.adSegment ?? WITHOUT_SEGMENT}
        disabled={segmentsQuery.isLoading || changeSegment.isPending}
        onChange={(event) => changeSegment.mutate(event.target.value || null)}
        className={cn(
          "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-8 max-w-44 rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-60",
          className,
        )}
      >
        <option value={WITHOUT_SEGMENT}>Sem segmento</option>
        {/* Segmento salvo que saiu da lista continua aparecendo */}
        {client.adSegment && !segments.some((segment) => segment.value === client.adSegment) && (
          <option value={client.adSegment}>{client.adSegment}</option>
        )}
        {segments.map((segment) => (
          <option key={segment.value} value={segment.value}>
            {segment.label}
          </option>
        ))}
      </select>
      {client.adIntelligenceOptOut && (
        <span
          title="O cliente escolheu não participar da inteligência compartilhada"
          className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap"
        >
          não compartilha
        </span>
      )}
    </div>
  );
};
