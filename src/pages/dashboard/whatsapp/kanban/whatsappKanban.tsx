import { useEffect } from "react";
import { KanbanColumn } from "./components/kanbanColumn";
import { KanbanCard } from "./components/kanbanCard";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useUserContext } from "@/context/UserContext/userContext";

export const WhatsappKanban = () => {
  const { user } = useUserContext();

  const findAllContactMessagesAwaitServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesAwaitServiceByUser"],
    queryFn: () => whatsappService.findAllContactMessagesAwaitServiceByUser(),
  });
  const listPagesContactMessagesAwaitService = findAllContactMessagesAwaitServiceByUser.data;

  const findAllContactMessagesInServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesInServiceByUser"],
    queryFn: () => whatsappService.findAllContactMessagesInServiceByUser(),
  });

  const contactMessagesInService = findAllContactMessagesInServiceByUser.data || [];
  const contactMessagesInServiceFromUser = contactMessagesInService.filter((msg) => msg.serviceUserServiceId === user?.id);
  const contactMessagesInServiceFromOthers = contactMessagesInService.filter((msg) => msg.serviceUserServiceId !== user?.id);

  useEffect(() => {
    return monitorForElements({
      onDrop: ({ source, location }) => {
        console.log("Dropped", { source, location });
      },
    });
  }, []);

  return (
    <div className="grid h-[calc(100dvh-16px)] grid-rows-[min-content_1fr] gap-5">
      <div className="flex border-collapse gap-1 overflow-auto">
        <KanbanColumn title="Aguardando">
          {listPagesContactMessagesAwaitService?.map((contactMessage) => (
            <KanbanCard key={contactMessage.id} contactMessage={contactMessage} />
          ))}
        </KanbanColumn>
        <KanbanColumn title="Meus atendimentos" count={contactMessagesInServiceFromUser.length}>
          {contactMessagesInServiceFromUser.map((contactMessage) => (
            <KanbanCard key={contactMessage.id} contactMessage={contactMessage} />
          ))}
        </KanbanColumn>
        <KanbanColumn title="Em atendimento" count={contactMessagesInServiceFromOthers.length}>
          {contactMessagesInServiceFromOthers.map((contactMessage) => (
            <KanbanCard key={contactMessage.id} contactMessage={contactMessage} />
          ))}
        </KanbanColumn>
      </div>
    </div>
  );
};
