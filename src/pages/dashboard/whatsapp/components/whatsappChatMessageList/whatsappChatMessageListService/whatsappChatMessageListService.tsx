import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { cn } from "@/lib/utils";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import { formatShortId } from "@/utils/formatString";
import { requestErrorHandling } from "@/utils/request";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useEffect, type FC } from "react";

type WhatsappChatMessageListServiceProps = {
  className?: string;
  contactService: WhatsappContactService;
  refetchContactService: () => void;
};

export const WhatsappChatMessageListService: FC<WhatsappChatMessageListServiceProps> = ({
  className,
  contactService,
  refetchContactService,
}) => {
  const { isConnected } = useSocketContext();
  const { user } = useUserContext();
  const { client } = useClientContext();

  const findAllServicesHistoryByContact = useInfiniteQuery({
    queryKey: [`contact-${contactService.id}`, "findAllServiceHistoryByContact", { contactId: contactService.id }, client.id],
    queryFn: ({ pageParam }) =>
      whatsappService.findAllServicesHistoryByContact({
        params: { contactId: contactService.id, clientId: client.id },
        queries: { page: pageParam, take: 10 },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const startServiceMutation = useMutation({
    mutationFn: whatsappService.startService,
    onError: requestErrorHandling,
  });

  const transferServiceMutation = useMutation({
    mutationFn: whatsappService.transferService,
    onError: requestErrorHandling,
  });

  const endServiceMutation = useMutation({
    mutationFn: whatsappService.endService,
    onError: requestErrorHandling,
  });

  useEffect(() => {
    socket.on(`contact:${contactService.id}:service:update`, () => {
      refetchContactService();
      findAllServicesHistoryByContact.refetch();
    });

    return () => {
      socket.off(`contact:${contactService.id}:service:update`);
    };
  }, [isConnected]);

  const loading = findAllServicesHistoryByContact.isFetching;

  console.log(contactService);

  return (
    <div className={cn(className, "grid grid-rows-[min-content_auto_min-content] gap-2 overflow-hidden")}>
      <h3>Histórico</h3>

      <ul className="flex flex-col-reverse overflow-scroll">
        {findAllServicesHistoryByContact.data?.pages.map((page) =>
          page.items.map((service) => (
            <li key={service.id} className="mb-4 rounded border p-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm">Protocolo: {formatShortId(service.id)}</p>
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    service.finished ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {service.finished ? "Finalizado" : "Em andamento"}
                </span>
              </div>
              <div className="flex flex-col-reverse gap-2">
                {service.actions.map((action) => (
                  <div
                    key={action.id}
                    data-type={action.type}
                    className="rounded border p-2 data-[type='1']:bg-blue-50 data-[type='2']:bg-yellow-50 data-[type='3']:bg-green-50"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-foreground/50 text-sm">{new Date(action.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{action.annotation}</p>
                  </div>
                ))}
              </div>
            </li>
          )),
        )}
        {findAllServicesHistoryByContact.isFetchingNextPage && <div>Carregando mais históricos...</div>}
        {findAllServicesHistoryByContact.data?.pages.length === 0 && <div>Nenhum histórico de atendimento encontrado.</div>}
      </ul>

      <div className="flex flex-col gap-2 [&>button]:w-full">
        {contactService.canBeServiceEnded && (
          <Button
            disabled={loading}
            onClick={() =>
              endServiceMutation.mutate({
                params: { contactId: contactService.id, clientId: client.id },
              })
            }
          >
            Finalizar atendimento
          </Button>
        )}
        {contactService.canBeServiceStarted && (
          <Button
            disabled={loading}
            onClick={() =>
              startServiceMutation.mutate({
                params: {
                  contactId: contactService.id,
                  clientId: client.id,
                },
              })
            }
          >
            Iniciar atendimento
          </Button>
        )}
        {contactService.canBeServiceTransferred && (
          <Button
            disabled={loading}
            onClick={() =>
              transferServiceMutation.mutate({
                params: {
                  contactId: contactService.id,
                  userId: user!.id,
                  clientId: client.id,
                },
              })
            }
          >
            Assumir atendimento
          </Button>
        )}
      </div>
    </div>
  );
};
