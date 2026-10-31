import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { managementService } from "@/services/api/managementService";
import { formatAcronym } from "@/utils/formatString";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle } from "lucide-react";
import { getContactName, getContactPhone } from "../managementFormat";

const REFRESH_INTERVAL_MS = 30 * 1000;

const timeAgo = (date: string | null) => (date ? formatDistanceToNowStrict(new Date(date), { locale: ptBR, addSuffix: true }) : "—");

export const InProgressTab = () => {
  const { client } = useClientContext();

  const findInProgressQuery = useQuery({
    queryKey: ["management", "inProgress", client.id],
    queryFn: () => managementService.findInProgress({ params: { clientId: client.id } }),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  if (findInProgressQuery.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-40 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (findInProgressQuery.isError) return <p className="text-destructive text-sm">Erro ao buscar os atendimentos em andamento.</p>;

  const attendants = findInProgressQuery.data ?? [];
  const totalServices = attendants.reduce((total, attendant) => total + attendant.services.length, 0);
  const busyAttendants = attendants.filter((attendant) => attendant.services.length > 0).length;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        {totalServices} atendimento(s) em andamento com {busyAttendants} colaborador(es). Atualiza a cada 30 segundos.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {attendants.map((attendant) => (
          <div key={attendant.userId} className="bg-card text-card-foreground flex flex-col rounded-xl border shadow-xs">
            <div className="flex items-center gap-3 border-b p-4">
              <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
                {formatAcronym(attendant.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{attendant.name}</p>
                <p className="text-muted-foreground truncate text-xs">{attendant.email}</p>
              </div>
              {!attendant.active && <Badge variant="secondary">Desativado</Badge>}
              <Badge variant={attendant.services.length ? "default" : "outline"} title="Atendimentos em andamento">
                {attendant.services.length}
              </Badge>
            </div>

            {attendant.services.length === 0 && <p className="text-muted-foreground p-4 text-sm">Sem atendimentos no momento.</p>}

            {attendant.services.length > 0 && (
              <ul className="max-h-72 divide-y overflow-y-auto">
                {attendant.services.map((service) => (
                  <li key={service.serviceId} className="flex items-start gap-2 px-4 py-2.5">
                    <MessageCircle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{getContactName(service.contact)}</p>
                      <p className="text-muted-foreground truncate text-xs">{getContactPhone(service.contact)}</p>
                    </div>
                    <div className="text-muted-foreground shrink-0 text-right text-xs">
                      <p title="Quando o colaborador assumiu">Assumiu {timeAgo(service.assignedAt)}</p>
                      <p title="Última mensagem da conversa">Última msg. {timeAgo(service.lastMessageAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
