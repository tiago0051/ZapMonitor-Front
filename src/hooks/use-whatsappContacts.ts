import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { openDB } from "idb";

export const useWhatsappContacts = () => {
  const { client } = useClientContext();

  const [pageToDownload, setPageToDownload] = useState(1);
  const [isPending, setIsPending] = useState(true);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [contacts, setContacts] = useState<WhatsappContactMessage[]>([]);

  const loadDb = openDB("app-db", 1, {
    upgrade(db) {
      db.createObjectStore("contacts", { keyPath: "id" });
    },
  });

  async function saveContacts(newContacts: WhatsappContactMessage[]) {
    const db = await loadDb;
    const tx = db.transaction("contacts", "readwrite");
    for (const contact of newContacts) {
      await tx.store.put(contact);
    }
    await tx.done;
  }

  async function getContacts() {
    try {
      const db = await loadDb;

      return await db.getAll("contacts");
    } catch {
      return [];
    }
  }

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
    enabled: !loadingContacts,
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
  }, [listPagesContactMessages]);

  useEffect(() => {
    if (!isPending) saveContacts(contacts);
  }, [isPending]);

  useEffect(() => {
    const fetchContacts = async () => {
      const contactsFromDB = await getContacts();
      if (contactsFromDB.length > 0) {
        setContacts(contactsFromDB.sort((a, b) => new Date(b.messageCreatedAt).getTime() - new Date(a.messageCreatedAt).getTime()));
      }
      setLoadingContacts(false);
    };

    fetchContacts();
  }, []);

  return {
    contacts,
    changeContacts: (contacts: WhatsappContactMessage[]) => {
      const newContactsList = contacts.sort((a, b) => new Date(b.messageCreatedAt).getTime() - new Date(a.messageCreatedAt).getTime());
      setContacts(newContactsList);
      saveContacts(newContactsList);
    },
    isPending,
  };
};
