import { useEffect } from "react";
import { KanbanColumn } from "./components/kanbanColumn";
import { KanbanCard } from "./components/kanbanCard";
import { whatsappService } from "@/services/api/whatsappService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useUserContext } from "@/context/UserContext/userContext";
import { toast } from "sonner";
import { requestErrorHandling } from "@/utils/request";

export const WhatsappKanban = () => {
  const { user } = useUserContext();

  const findAllContactMessagesAwaitServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesAwaitServiceByUser"],
    queryFn: () => whatsappService.findAllContactMessagesAwaitServiceByUser(),
  });
  const listPagesContactMessagesAwaitService = findAllContactMessagesAwaitServiceByUser.data || [];

  const findAllContactMessagesInServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesInServiceByUser"],
    queryFn: () => whatsappService.findAllContactMessagesInServiceByUser(),
  });

  const contactMessagesInService = findAllContactMessagesInServiceByUser.data || [];
  const contactMessagesInServiceFromUser = contactMessagesInService.filter((msg) => msg.serviceUserServiceId === user?.id);
  const contactMessagesInServiceFromOthers = contactMessagesInService.filter((msg) => msg.serviceUserServiceId !== user?.id);

  const startServiceMutation = useMutation({
    mutationFn: whatsappService.startService,
    onSuccess: () => {
      toast.success("Atendimento iniciado com sucesso");
    },
    onError: requestErrorHandling,
  });

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        const contactId = source.data.id as string;
        const [dropTarget] = location.current.dropTargets;

        if (dropTarget.data.title === "Meus atendimentos") {
          startServiceMutation.mutate({
            params: {
              contactId,
            },
          });
        }
      },
    });
  }, [startServiceMutation]);

  return (
    <div className="grid grid-rows-[min-content_1fr] gap-5">
      <div className="grid w-min grid-cols-[repeat(3,320px)] gap-1">
        <KanbanColumn title="Aguardando" count={listPagesContactMessagesAwaitService.length}>
          {listPagesContactMessagesAwaitService?.map((contactMessage) => (
            <KanbanCard key={contactMessage.id} contactMessage={contactMessage} isDraggable columnTitle="Aguardando" />
          ))}
        </KanbanColumn>
        <KanbanColumn title="Meus atendimentos" count={contactMessagesInServiceFromUser.length} isDroppable>
          {contactMessagesInServiceFromUser.map((contactMessage) => (
            <KanbanCard key={contactMessage.id} contactMessage={contactMessage} columnTitle="Meus atendimentos" />
          ))}
        </KanbanColumn>
        <KanbanColumn title="Em atendimento" count={contactMessagesInServiceFromOthers.length}>
          {contactMessagesInServiceFromOthers.map((contactMessage) => (
            <KanbanCard key={contactMessage.id} contactMessage={contactMessage} columnTitle="Em atendimento" />
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
};
