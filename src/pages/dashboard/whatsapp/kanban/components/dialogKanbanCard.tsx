import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useState, type FC } from "react";
import { WhatsappChatMessageList } from "../../components/whatsappChatMessageList";
import { WhatsappChatMessageHeader } from "../../components/whatsappChatMessageList/whatsappChatMessageHeader";
import { useQuery } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { WhatsappChatMessageListService } from "@/pages/dashboard/whatsapp/components/whatsappChatMessageList/whatsappChatMessageListService/whatsappChatMessageListService.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useIsMobile } from "@/hooks/use-mobile.ts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";

type DialogKanbanCardProps = {
  children?: React.ReactNode;
  contactMessage: WhatsappContactMessage;
};

export const DialogKanbanCard: FC<DialogKanbanCardProps> = ({ children, contactMessage }) => {
  const { client } = useClientContext();
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);

  const findContactServiceByContact = useQuery({
    queryKey: [`contact-${contactMessage.id}`, "findContactServiceByContact", client.id],
    queryFn: async () =>
      await whatsappService.findContactServiceByContact({
        params: {
          contactId: contactMessage.id,
          clientId: client.id,
        },
      }),
    enabled: isOpen,
  });

  const contactService = findContactServiceByContact.data;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent
        className="grid max-h-dvh max-w-dvw grid-rows-[1fr] sm:max-w-none md:grid-cols-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {!isMobile && (
          <>
            <div className={"grid grid-rows-[min-content_min-content_auto] gap-2 overflow-hidden md:col-span-1"}>
              <DialogHeader>
                <DialogTitle>Detalhes do contato</DialogTitle>
                <DialogDescription>Informações sobre o contato selecionado.</DialogDescription>
              </DialogHeader>

              <WhatsappChatMessageHeader contactMessage={contactMessage} className="w-full" />

              <Separator />

              {contactService && (
                <WhatsappChatMessageListService
                  contactService={contactService}
                  refetchContactService={() => findContactServiceByContact.refetch()}
                />
              )}
            </div>

            {contactService && (
              <WhatsappChatMessageList
                className={"md:col-span-3"}
                whatsappConfigurationId={contactMessage.whatsappConfigurationId}
                contactService={contactService}
              />
            )}
          </>
        )}

        {isMobile && (
          <div className={"grid grid-rows-[min-content_1fr] gap-2 overflow-hidden"}>
            <div className={"grid grid-rows-[min-content_min-content] gap-2"}>
              <DialogHeader>
                <DialogTitle hidden>Detalhes do contato</DialogTitle>
                <DialogDescription hidden>Informações sobre o contato selecionado.</DialogDescription>
              </DialogHeader>

              <WhatsappChatMessageHeader contactMessage={contactMessage} className="w-full" />
            </div>

            <Tabs defaultValue="messages" className={"grid max-h-full grid-rows-[1fr] overflow-hidden"}>
              <TabsList>
                <TabsTrigger value="messages">Mensagens</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              {contactService && (
                <>
                  <TabsContent value={"messages"} className={"grid max-h-full grid-rows-[1fr] overflow-hidden"}>
                    <WhatsappChatMessageList
                      whatsappConfigurationId={contactMessage.whatsappConfigurationId}
                      contactService={contactService}
                    />
                  </TabsContent>

                  <TabsContent value={"history"}>
                    <WhatsappChatMessageListService
                      contactService={contactService}
                      refetchContactService={() => findContactServiceByContact.refetch()}
                    />
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
