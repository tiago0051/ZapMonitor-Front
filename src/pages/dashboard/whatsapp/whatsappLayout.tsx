import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { socket } from "@/services/socket/socket";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Outlet } from "react-router";

type WhatsappLayoutContextType = {
  contactSelected: WhatsappContactMessage | null;
  hasContactSelected: boolean;
  setContactSelected: (contact: WhatsappContactMessage | null) => void;
  usersInContacts: Record<string, User[]>;
};

const WhatsappContext = createContext({} as WhatsappLayoutContextType);

export const WhatsappLayout = () => {
  const { user } = useUserContext();

  const [contactSelected, setContactSelected] = useState<WhatsappContactMessage | null>(null);
  const [usersInContacts, setUsersInContacts] = useState<Record<string, User[]>>({});

  const queryClient = useQueryClient();

  const newMessageAudio = useMemo(() => new Audio("/assets/whatsapp/chat/sounds/new-message.mp3"), []);

  useEffect(() => {
    socket.on("chat:update", async ({ contactId, eventType }: { contactId: string; eventType: WhatsappMessageType }) => {
      if (contactId) {
        const isNewMessageIncoming = eventType === WhatsappMessageType.INCOMING;
        const hasUsersInContact = usersInContacts[contactId] && usersInContacts[contactId].length > 0;

        if (isNewMessageIncoming && !hasUsersInContact) await newMessageAudio.play();

        const isContactSelected = contactSelected?.id === contactId;

        if (isContactSelected) {
          if (isNewMessageIncoming) await newMessageAudio.play();
        }

        queryClient.invalidateQueries({
          queryKey: [`contact-${contactId}`],
        });
      }

      queryClient.invalidateQueries({
        queryKey: ["chat:update"],
      });
    });

    return () => {
      socket.off("chat:update");
    };
  }, [contactSelected, usersInContacts, user, newMessageAudio, queryClient]);

  useEffect(() => {
    socket.on("users:byChat", (data: Record<string, User[]>) => {
      setUsersInContacts(data);
    });

    return () => {
      socket.off("users:byChat");
    };
  }, []);

  useEffect(() => {
    if (user) socket.emit("chat:start", user!.id);
  }, [user]);

  return (
    <WhatsappContext.Provider
      value={{
        contactSelected,
        hasContactSelected: !!contactSelected,
        setContactSelected,
        usersInContacts,
      }}
    >
      <Outlet />
    </WhatsappContext.Provider>
  );
};

export const useWhatsappContext = () => useContext(WhatsappContext);
