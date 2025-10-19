import { useEffect, useState } from "react";
import { KanbanColumn } from "./components/kanbanColumn";
import { KanbanCard } from "./components/kanbanCard";
import { whatsappService } from "@/services/api/whatsappService";
import { useMutation, useQuery } from "@tanstack/react-query";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useUserContext } from "@/context/UserContext/userContext";
import { toast } from "sonner";
import { requestErrorHandling } from "@/utils/request";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import { Input } from "@/components/ui/input";
import { useDebounceValue } from "usehooks-ts";
import { globalContants } from "@/contants/globalContants";
import { Label } from "@/components/ui/label";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "react-router";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { FiBookOpen } from "react-icons/fi";
import { Header } from "@/components/ui/header";

export const WhatsappKanban = () => {
  const { user } = useUserContext();
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();

  const [filterCategories, setFilterCategories] = useState<WhatsappMessageCategory[]>([]);
  const [filterText, setFilterText] = useDebounceValue("", globalContants.DEBOUNCE_DELAY);

  const findAllContactMessagesAwaitServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesAwaitServiceByUser", client.id, filterText, filterCategories],
    queryFn: () =>
      whatsappService.findAllContactMessagesAwaitServiceByUser({
        params: {
          clientId: client.id,
        },
        queries: {
          categoryIds: filterCategories.map((category) => category.id),
          text: filterText,
        },
      }),
  });
  const listPagesContactMessagesAwaitService = findAllContactMessagesAwaitServiceByUser.data || [];

  const findAllContactMessagesInServiceByUser = useQuery({
    queryKey: ["chat:update", "findAllContactMessagesInServiceByUser", client.id, filterText, filterCategories],
    queryFn: () =>
      whatsappService.findAllContactMessagesInServiceByUser({
        params: {
          clientId: client.id,
        },
        queries: {
          categoryIds: filterCategories.map((category) => category.id),
          text: filterText,
        },
      }),
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
              clientId: client.id,
            },
          });
        }
      },
    });
  }, [startServiceMutation, client]);

  return (
    <>
      <Header title="Whatsapp">
        <Link className={buttonVariants()} to={`${baseUrl}/whatsapp/contacts`}>
          <FiBookOpen />
          Contatos
        </Link>
      </Header>
      <div className="grid gap-4 md:grid-cols-4">
        <div className="grid gap-1">
          <Label>Filtrar por categoria:</Label>
          <DialogFilterCategory categories={filterCategories} onSelectCategories={setFilterCategories} />
        </div>
        <div className="space-y-1">
          <Label>Buscar contato:</Label>
          <Input placeholder="Nome ou número de telefone" onChange={(e) => setFilterText(e.currentTarget.value)} />
        </div>
      </div>
      <div className="grid w-min max-w-screen grid-cols-[repeat(3,320px)] gap-1 overflow-scroll">
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
    </>
  );
};
