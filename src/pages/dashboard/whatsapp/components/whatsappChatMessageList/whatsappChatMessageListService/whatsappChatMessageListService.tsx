import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useEffect, type FC } from "react";
import { ListServiceItem } from "./listServiceItem";
import { formatBoldText } from "@/utils/formatString";
import { Bot } from "lucide-react";

type WhatsappChatMessageListServiceProps = {
  contactService: WhatsappContactService;
  refetchContactService: () => void;
};

export const WhatsappChatMessageListService: FC<WhatsappChatMessageListServiceProps> = ({ contactService, refetchContactService }) => {
  const { isConnected, socket } = useSocketContext();
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
  const services = findAllServicesHistoryByContact.data?.pages.flatMap((page) => page.items) || [];
  const afterService = services[1];
  const nowService = services[0];
  const presentationService = nowService || afterService;

  return (
    <div
      data-has-ai-resume={!!presentationService}
      className="grid max-h-full gap-[24px] overflow-hidden data-[has-ai-resume=true]:grid-rows-2"
    >
      {!!presentationService && (
        <div className="border-primary/20 bg-primary/5 overflow-auto rounded border p-3">
          <div className="text-primary mb-2 flex items-center gap-2 font-medium">
            <Bot className="h-4 w-4" />
            <span className="text-sm">Resumo da IA</span>
          </div>
          <pre className="text-foreground/80 font-sans text-sm whitespace-pre-wrap">
            {formatBoldText(presentationService.aiResume || "")}
          </pre>
        </div>
      )}
      <div className={"grid grid-rows-[min-content_auto_min-content] gap-2 overflow-hidden"}>
        <h3>Histórico</h3>

        <ul className="flex flex-col-reverse justify-end overflow-scroll">
          {services.map((service) => (
            <ListServiceItem key={service.id} service={service} />
          ))}
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
    </div>
  );
};
