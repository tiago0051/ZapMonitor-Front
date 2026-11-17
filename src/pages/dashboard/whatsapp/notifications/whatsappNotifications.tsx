import { useBaseUrl } from "@/hooks/use-baseUrl";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useServiceGroupSelection } from "../useServiceGroupSelection";
import { requestOpenContact } from "./openContactRequest";
import { useNewContactNotifications } from "./useNewContactNotifications";

/** Avisos de contato novo e de mensagens dos atendimentos do usuário em qualquer tela do painel. */
export const WhatsappNotifications = () => {
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const { serviceGroups } = useServiceGroupSelection();

  // Conversa aberta agora na tela de atendimento: não avisa de mensagem que o usuário já está vendo
  const isOnWhatsapp = pathname.replace(/\/$/, "") === `${baseUrl}/whatsapp`;
  const selectedContactId = isOnWhatsapp ? (searchParams.get("contactId") ?? undefined) : undefined;

  useNewContactNotifications({
    serviceGroupIds: serviceGroups.map((group) => group.id),
    selectedContactId,
    onOpenContact: (contact, tab) => {
      if (requestOpenContact({ contact, tab })) return;

      navigate(`${baseUrl}/whatsapp?contactId=${contact.id}&tab=${tab}`);
    },
  });

  return null;
};
