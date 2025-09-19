import { whatsappService } from "@/services/api/whatsappService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { WhatsappChatMessageList } from "./whatsappChatMessageList";
import { useUserContext } from "@/context/UserContext/userContext";
import { socket } from "@/services/socket/socket";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsappContactOutServiceList } from "./whatsappContactOutServiceList";
import { WhatsappContactInServiceList } from "./whatsappContactInServiceList";

export const WhatsappChat = () => {
  const { user } = useUserContext();

  const isMobile = useIsMobile();

  const [contactSelected, setContactSelected] =
    useState<WhatsappContactMessage | null>(null);
  const hasContactSelected = !!contactSelected;

  const [usersInContacts, setUsersInContacts] = useState<
    Record<string, User[]>
  >({});

  const queryClient = useQueryClient();

  const findCountUnreadMessagesQuery = useQuery({
    queryKey: ["chat:update", "whatsappChatNoRead"],
    queryFn: whatsappService.findCountUnreadMessages,
  });
  const countUnreadMessages = findCountUnreadMessagesQuery.data || 0;
  const newMessageAudio = useMemo(
    () => new Audio("/assets/whatsapp/chat/sounds/new-message.mp3"),
    []
  );

  useEffect(() => {
    socket.on(
      "chat:update",
      async ({
        contactId,
        eventType,
      }: {
        contactId: string;
        eventType: WhatsappMessageType;
      }) => {
        if (contactId) {
          const isNewMessageIncoming =
            eventType === WhatsappMessageType.INCOMING;
          const hasUsersInContact =
            usersInContacts[contactId] && usersInContacts[contactId].length > 0;

          if (isNewMessageIncoming && !hasUsersInContact)
            await newMessageAudio.play();

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
      }
    );

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
    <div className="grid sm:grid-cols-4 grid-rows-[calc(100svh-16px)]">
      {(!isMobile || !hasContactSelected) && (
        <div className="border-r ">
          <Tabs defaultValue="allContacts" className="w-full pr-4">
            <TabsList className="w-full">
              <TabsTrigger
                value="allContacts"
                className="w-full text-sm flex items-center gap-2 justify-center"
              >
                Todos
                {countUnreadMessages > 0 && (
                  <div className="w-4 h-4 text-sm flex justify-center items-center rounded-full bg-primary text-primary-foreground">
                    {countUnreadMessages}
                  </div>
                )}
              </TabsTrigger>
              <TabsTrigger value="inService" className="w-full text-sm">
                Em atendimento
              </TabsTrigger>
            </TabsList>

            <TabsContent value="allContacts">
              <WhatsappContactOutServiceList
                contactSelected={contactSelected}
                setContactSelected={setContactSelected}
                usersInContacts={usersInContacts}
              />
            </TabsContent>

            <TabsContent value="inService">
              <WhatsappContactInServiceList
                contactSelected={contactSelected}
                setContactSelected={setContactSelected}
                usersInContacts={usersInContacts}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}

      {!hasContactSelected && !isMobile && (
        <div className="col-span-3 h-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <FaWhatsapp className="text-green-600" size={60} />
            <h1 className="text-2xl text-green-600 font-bold text-center">
              Seja bem-vindo ao WhatsApp, selecione um contato
            </h1>
          </div>
        </div>
      )}

      {hasContactSelected && (
        <WhatsappChatMessageList
          contactMessage={contactSelected}
          onBack={() => setContactSelected(null)}
        />
      )}
    </div>
  );
};
