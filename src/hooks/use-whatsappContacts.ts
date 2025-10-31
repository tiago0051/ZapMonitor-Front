import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

export const useWhatsappContacts = () => {
  const { client } = useClientContext();

  const [pageToDownload, setPageToDownload] = useState(1);
  const [isPending, setIsPending] = useState(true);
  const [contacts, setContacts] = useLocalStorage<WhatsappContactMessage[]>("contacts", []);

  const findAllContactMessagesQuery = useQuery({
    queryKey: ["chat:update", "findAllContactMessages", pageToDownload],
    queryFn: async () =>
      await whatsappService.findAllContactMessagesByUser({
        queries: {
          page: pageToDownload,
          take: 200,
          categoryIds: [],
          text: "",
        },
        params: {
          clientId: client.id,
        },
      }),
  });
  const listPagesContactMessages = findAllContactMessagesQuery.data;

  useEffect(() => {
    if (listPagesContactMessages) {
      if (listPagesContactMessages.total !== contacts.length) {
        if (listPagesContactMessages.page === 1) {
          setContacts([]);
        }

        const newMessagesList = listPagesContactMessages.items;
        setContacts((prev) => [...prev, ...newMessagesList]);

        if (listPagesContactMessages.canNextPage) setPageToDownload((prev) => prev + 1);
        else setIsPending(false);
      } else {
        setIsPending(false);
      }
    }
  }, [contacts, listPagesContactMessages, setContacts]);

  return {
    contacts,
    changeContacts: (contacts: WhatsappContactMessage[]) =>
      setContacts(contacts.sort((a, b) => new Date(b.messageCreatedAt).getTime() - new Date(a.messageCreatedAt).getTime())),
    isPending,
  };
};
