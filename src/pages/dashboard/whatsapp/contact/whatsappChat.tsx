import { FaWhatsapp } from "react-icons/fa";
import { useIsMobile } from "@/hooks/use-mobile";
import { WhatsappChatMessages } from "./whatsappChatMessages";
import { WhatsappContactsList } from "./whatsappContacts";
import { Header } from "@/components/ui/header";
import { useNavigate } from "react-router";
import { useWhatsappContext } from "@/context/WhatsappContext/whatsappContext";

export const WhatsappContacts = () => {
  const navigate = useNavigate();
  const { contactSelected, hasContactSelected, setContactSelected, usersInContacts } = useWhatsappContext();

  const isMobile = useIsMobile();

  return (
    <div className={"grid max-h-[calc(100dvh-60px)] grid-rows-[min-content_1fr] gap-2 overflow-hidden md:max-h-[calc(100dvh-22px)]"}>
      <Header title="Lista de contatos" onBack={() => (hasContactSelected ? setContactSelected(null) : navigate(-1))} />
      <div className="grid grid-rows-[1fr] overflow-hidden sm:grid-cols-6">
        {(!isMobile || !hasContactSelected) && (
          <div className="col-span-2 border-r">
            <WhatsappContactsList usersInContacts={usersInContacts} />
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

        {hasContactSelected && <WhatsappChatMessages className="col-span-4" contactMessage={contactSelected!} />}
      </div>
    </div>
  );
};
