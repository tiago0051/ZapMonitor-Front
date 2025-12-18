import { useEffect, useMemo, useState, type FC } from "react";
import { useClientContext } from "../ClientContext/clientContext";
import { socket } from "@/services/socket/socket";
import { WhatsappContext } from "./whatsappContext";
import { useWhatsappContacts } from "@/hooks/use-whatsappContacts";
import { FaWhatsapp } from "react-icons/fa";
import { WhatsappEventType } from "@/enums/whatsappEventType.enum";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { useSocketContext } from "../SocketContext/socketContext";
import { useEventsContext } from "../EventsContext/eventsContext";

type WhatsappProviderProps = {
  children: React.ReactNode;
};

export const WhatsappProvider: FC<WhatsappProviderProps> = ({ children }) => {
  const { isConnected } = useSocketContext();
  const { client } = useClientContext();
  const { eventsToExecute, changeEventExecutedStatus } = useEventsContext();
  const contactEventsToExecute = eventsToExecute.filter((item) => item.eventType === WhatsappEventType.UpdateContactMessage);

  const { contacts, changeContacts, isPending } = useWhatsappContacts();

  const [contactSelected, setContactSelected] = useState<WhatsappContactMessage | null>(null);
  const [usersInContacts, setUsersInContacts] = useState<Record<string, User[]>>({});

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
    if (isConnected) socket.emit("chat:start", client.id);
  }, [isConnected, client]);

  useEffect(() => {
    if (!isPending) {
      contactEventsToExecute.forEach((event) => {
        const payloadParsed = JSON.parse(event.payload) as { contact: WhatsappContactMessage; isNewMessage: boolean };

        changeContacts([payloadParsed.contact]);

        if (payloadParsed.isNewMessage && payloadParsed.contact.messageType === WhatsappMessageType.INCOMING) playSound();

        changeEventExecutedStatus(event);
      });
    }
  }, [contactEventsToExecute, isPending]);

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
