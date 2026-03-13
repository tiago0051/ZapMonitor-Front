import { openDB } from "idb";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

function orderContactsByLastMessage(contacts: WhatsappContactMessage[]) {
  const newList = contacts.sort((a, b) => new Date(b.messageCreatedAt).getTime() - new Date(a.messageCreatedAt).getTime());
  return [...newList];
}

export const useWhatsappContacts = () => {
  const { client } = useClientContext();
  const [loadingData, setLoadingData] = useState<{ total: number; value: number }>({ total: 0, value: 0 });

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

  async function getContacts(): Promise<WhatsappContactMessage[]> {
    try {
      const db = await loadDb;

      return await db.getAll("contacts");
    } catch {
      return [];
    }
  }

  const contactsQuery = useQuery({
    queryKey: ["whatsappContacts"],
    queryFn: async () => {
      const contactsFromDB = await getContacts();
      if (contactsFromDB.length > 0) return orderContactsByLastMessage(contactsFromDB);
      if (contactsFromDB.length === 0) {
        const temporaryContacts: WhatsappContactMessage[] = [];

        const findWhatsappContactsByPage = async (page: number) => {
          const data = await whatsappService.findAllContactMessages({
            params: {
              clientId: client.id,
            },
            queries: {
              page,
              take: 200,
            },
          });

          data.items.forEach((item) => temporaryContacts.push(item));

          setLoadingData({ value: page, total: Math.ceil(data.total / 200) });

          await new Promise((resolve) => setTimeout(resolve, 100));

          if (!data.canNextPage) return;

          await findWhatsappContactsByPage(page + 1);
        };

        await findWhatsappContactsByPage(1);

        return temporaryContacts;
      }
    },
  });

  async function changeContacts(contacts: WhatsappContactMessage[]) {
    await saveContacts(contacts);

    contactsQuery.refetch();
  }

  useEffect(() => {
    if (contactsQuery.data) saveContacts(contactsQuery.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsQuery.data, contactsQuery.isLoading]);

  return {
    contacts: contactsQuery.data || [],
    changeContacts,
    isPending: contactsQuery.isLoading,
    loadingData,
  };
};
