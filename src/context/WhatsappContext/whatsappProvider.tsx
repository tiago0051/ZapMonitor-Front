import { useEffect, useMemo, useState, type FC } from "react";
import { useClientContext } from "../ClientContext/clientContext";
import { socket } from "@/services/socket/socket";
import { WhatsappContext } from "./whatsappContext";
import { useWhatsappContacts } from "@/hooks/use-whatsappContacts";
import { FaWhatsapp } from "react-icons/fa";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";

type WhatsappProviderProps = {
  children: React.ReactNode;
};

export const WhatsappProvider: FC<WhatsappProviderProps> = ({ children }) => {
  const { client } = useClientContext();

  const { contacts, changeContacts, isPending } = useWhatsappContacts();
  const [contactSelected, setContactSelected] = useState<WhatsappContactMessage | null>(null);
  const [usersInContacts, setUsersInContacts] = useState<Record<string, User[]>>({});
  const [contactToUpdate, setContactToUpdate] = useState<WhatsappContactMessage | null>(null);

  const newMessageAudio = useMemo(() => new Audio("/assets/whatsapp/chat/sounds/new-message.mp3"), []);

  function playSound() {
    newMessageAudio.play();
  }

  useEffect(() => {
    socket.on("users:byChat", (data: Record<string, User[]>) => {
      setUsersInContacts(data);
    });

    return () => {
      socket.off("users:byChat");
    };
  }, []);

  useEffect(() => {
    socket.emit("chat:start", client.id);
  }, [client]);

  useEffect(() => {
    socket.on("contacts:update", (data: { contact: WhatsappContactMessage; isNewMessage: boolean }) => {
      setContactToUpdate(data.contact);

      if (data.isNewMessage && data.contact.messageType === WhatsappMessageType.INCOMING) {
        playSound();
      }
    });

    return () => {
      socket.off("contacts:update");
    };
  }, []);

  useEffect(() => {
    if (contactToUpdate) {
      const contactIndex = contacts.findIndex((c) => c.id === contactToUpdate.id);

      let contactsCopy = [...contacts];
      if (contactIndex !== -1) {
        contactsCopy[contactIndex] = contactToUpdate;
      } else {
        contactsCopy = [contactToUpdate, ...contactsCopy];
      }

      changeContacts(contactsCopy);

      setContactToUpdate(null);
    }
  }, [contactToUpdate]);

  if (isPending) {
    return (
      <div className="bg-background absolute top-0 right-0 bottom-0 left-0 flex h-full w-full flex-col items-center justify-center gap-4">
        <FaWhatsapp className="text-green-600" size={60} />
        <h1 className="text-center text-2xl font-bold text-green-600">Baixando histórico de mensagens...</h1>
      </div>
    );
  }

  return (
    <WhatsappContext.Provider
      value={{
        contactSelected,
        hasContactSelected: !!contactSelected,
        setContactSelected,
        usersInContacts,
        playSound,
        allContacts: contacts,
        inServiceContacts: contacts.filter((contact) => !!contact.serviceUserServiceId),
      }}
    >
      {children}
    </WhatsappContext.Provider>
  );
};
