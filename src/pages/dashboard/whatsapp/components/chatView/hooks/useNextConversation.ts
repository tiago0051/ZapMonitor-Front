import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { requestOpenContact } from "../../../notifications/openContactRequest";
import { useServiceGroupSelection } from "../../../useServiceGroupSelection";

// Poucos bastam: só precisamos da primeira conversa diferente da atual
const NEXT_CANDIDATES = 5;

/** Leva o atendente à próxima conversa depois de encerrar: a próxima dos Meus ou a mais antiga da fila. */
export const useNextConversation = (currentContactId: string) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const { selectedServiceGroupId } = useServiceGroupSelection();
  const [loadingTab, setLoadingTab] = useState<Tab | null>(null);

  async function openNext(tab: "mine" | "queue") {
    setLoadingTab(tab);
    try {
      const serviceGroupId = tab === "queue" ? selectedServiceGroupId : undefined;
      // Sempre do servidor: a lista em cache pode estar desatualizada logo depois de encerrar
      const page = await queryClient.fetchQuery({
        queryKey: ["whatsapp", "nextConversation", tab, serviceGroupId],
        queryFn: () =>
          whatsappService.findAllContacts({
            params: { clientId: client.id },
            queries: { page: 1, take: NEXT_CANDIDATES, tab, text: "", serviceGroupId },
          }),
        staleTime: 0,
      });

      // A fila vem da mais antiga para a mais nova
      const next = page.items.find((item) => item.id !== currentContactId);
      if (!next) {
        toast.info(tab === "mine" ? "Você não tem outros atendimentos abertos" : "A fila está vazia");
        return;
      }

      requestOpenContact({ contact: next, tab });
    } catch (error) {
      requestErrorHandling(error);
    } finally {
      setLoadingTab(null);
    }
  }

  return {
    openNextMine: () => openNext("mine"),
    openNextFromQueue: () => openNext("queue"),
    loadingTab,
  };
};
