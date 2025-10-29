import { FaWhatsapp } from "react-icons/fa";
import { useIsMobile } from "@/hooks/use-mobile";
import { useWhatsappContext } from "../whatsappLayout";
import { WhatsappChatMessages } from "./whatsappChatMessages";
import { WhatsappContactsList } from "./whatsappContacts";
import { Header } from "@/components/ui/header";

export const WhatsappContacts = () => {
  const { contactSelected, hasContactSelected, setContactSelected, usersInContacts } = useWhatsappContext();

  const isMobile = useIsMobile();

  return (
    <>
      <Header title="Lista de contatos" />
      <div className="grid grid-rows-[calc(100svh-100px)] sm:grid-cols-6">
        {(!isMobile || !hasContactSelected) && (
          <div className="col-span-2 border-r">
            <WhatsappContactsList
              contactSelected={contactSelected}
              setContactSelected={setContactSelected}
              usersInContacts={usersInContacts}
            />
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
    </>
  );
};
