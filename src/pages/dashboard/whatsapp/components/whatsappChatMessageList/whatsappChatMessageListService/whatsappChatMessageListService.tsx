import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { formatShortId } from "@/utils/formatString";
import { requestErrorHandling } from "@/utils/request";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import type { FC } from "react";
import { toast } from "sonner";

type WhatsappChatMessageListServiceProps = {
  contactService: WhatsappContactService;
};

export const WhatsappChatMessageListService: FC<WhatsappChatMessageListServiceProps> = ({ contactService }) => {
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
    onSuccess: () => {
      toast.success("Atendimento iniciado com sucesso");
    },
    onError: requestErrorHandling,
  });

  const transferServiceMutation = useMutation({
    mutationFn: whatsappService.transferService,
    onSuccess: () => {
      toast.success("Atendimento transferido com sucesso");
    },
    onError: requestErrorHandling,
  });

  const endServiceMutation = useMutation({
    mutationFn: whatsappService.endService,
    onSuccess: () => {
      toast.success("Atendimento finalizado com sucesso");
    },
    onError: requestErrorHandling,
  });

  return (
    <div className="flex flex-col justify-between overflow-hidden border-l px-2 py-4">
      <h3>Histórico de atendimentos</h3>

      <div className="flex flex-col-reverse overflow-auto">
        {findAllServicesHistoryByContact.data?.pages.map((page) =>
          page.items.map((service) => (
            <div key={service.id} className="mb-4 rounded border p-2">
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
            </div>
          )),
        )}
        {findAllServicesHistoryByContact.isFetchingNextPage && <div>Carregando mais históricos...</div>}
        {findAllServicesHistoryByContact.data?.pages.length === 0 && <div>Nenhum histórico de atendimento encontrado.</div>}
      </div>

      <div className="flex flex-col gap-2 [&>button]:w-full">
        {contactService.canBeServiceEnded && (
          <Button
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
