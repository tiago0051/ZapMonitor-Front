import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { FaWhatsapp } from "react-icons/fa";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsappContactOutServiceList } from "./whatsappContactOutServiceList";
import { WhatsappContactInServiceList } from "./whatsappContactInServiceList";
import { useWhatsappContext } from "../whatsappLayout";
import { WhatsappChatMessages } from "./whatsappChatMessages";
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

export const WhatsappChat = () => {
  const { contactSelected, hasContactSelected, setContactSelected, usersInContacts } = useWhatsappContext();

  const isMobile = useIsMobile();

  const findCountUnreadMessagesQuery = useQuery({
    queryKey: ["chat:update", "whatsappChatNoRead"],
    queryFn: whatsappService.findCountUnreadMessages,
  });
  const countUnreadMessages = findCountUnreadMessagesQuery.data || 0;

  return (
    <Tabs defaultValue="allContacts" className="grid">
      <div className="flex max-w-full justify-between overflow-x-auto">
        <TabsList>
          <TabsTrigger value="allContacts" className="flex items-center justify-center gap-2 text-xs">
            Todos
            {countUnreadMessages > 0 && (
              <div className="bg-primary text-primary-foreground flex h-4 w-4 items-center justify-center rounded-full text-sm">
                {countUnreadMessages}
              </div>
            )}
          </TabsTrigger>
          <TabsTrigger value="inService" className="w-full text-xs">
            Em atendimento
          </TabsTrigger>
        </TabsList>

        <Link to={"/dashboard/whatsapp/kanban"}>
          <Button variant={"outline"}>Kanban</Button>
        </Link>
      </div>
      <div className="grid grid-rows-[calc(100svh-100px)] sm:grid-cols-6">
        {(!isMobile || !hasContactSelected) && (
          <div className="col-span-2 border-r">
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
          </div>
        )}

        {!hasContactSelected && !isMobile && (
          <div className="col-span-4 flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <FaWhatsapp className="text-green-600" size={60} />
              <h1 className="text-center text-2xl font-bold text-green-600">Seja bem-vindo ao WhatsApp, selecione um contato</h1>
            </div>
          </div>
        )}

        {hasContactSelected && (
          <WhatsappChatMessages className="col-span-4" contactMessage={contactSelected!} onBack={() => setContactSelected(null)} />
        )}
      </div>
    </Tabs>
  );
};
