import { useEffect, useState } from "react";
import { openDB } from "idb";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";

export const useWhatsappContacts = () => {
  const { client } = useClientContext();

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

  async function changeContacts(contacts: WhatsappContactMessage[]) {
    await saveContacts(contacts);

    const newContactsList = await getContacts();
    setContacts(newContactsList);
  }

  useEffect(() => {
    const loadAsync = async () => {
      const contactsFromDB = await getContacts();
      if (contactsFromDB.length > 0) {
        setContacts(contactsFromDB.sort((a, b) => new Date(b.messageCreatedAt).getTime() - new Date(a.messageCreatedAt).getTime()));
      }
      if (contactsFromDB.length === 0) {
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

          return data;
        };

        let canFindNextPage = true;
        let page = 1;

        const temporaryContacts: WhatsappContactMessage[] = [];

        while (canFindNextPage) {
          const data = await findWhatsappContactsByPage(page);

          data.items.forEach((item) => temporaryContacts.push(item));

          page++;
          canFindNextPage = data.canNextPage;
        }

        changeContacts(temporaryContacts);
      }

      setLoadingContacts(false);
    };

    loadAsync();
  }, []);

  return {
    contacts: contacts.sort((a, b) => new Date(b.messageCreatedAt).getTime() - new Date(a.messageCreatedAt).getTime()),
    changeContacts,
    isPending: loadingContacts,
  };
};
