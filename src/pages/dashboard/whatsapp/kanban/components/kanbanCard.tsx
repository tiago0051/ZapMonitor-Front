import parsePhoneNumberFromString from "libphonenumber-js";
import { DialogKanbanCard } from "./dialogKanbanCard";
import { WhatsappChatContactMessage } from "../../components/whatsappChatContactMessage";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { Badge } from "@/components/ui/badge";
import { useWhatsappContext } from "../../whatsappLayout";
import { formatShortName } from "@/utils/formatString";
import { useEffect, useRef } from "react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { useUserContext } from "@/context/UserContext/userContext";

type KanbanCardProps = {
  contactMessage: WhatsappContactMessage;
};

export const KanbanCard = ({ contactMessage }: KanbanCardProps) => {
  const ref = useRef<HTMLButtonElement>(null);

  const { user } = useUserContext();
  const { usersInContacts } = useWhatsappContext();

  const phoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);
  const isBrazilianPhoneNumber = phoneNumber?.country === "BR";

  const formattedPhoneNumber = isBrazilianPhoneNumber ? phoneNumber?.formatNational() : contactMessage.phoneNumber;

  const hasCategories = contactMessage.categories && contactMessage.categories.length > 0;

  const usersInContact = usersInContacts[contactMessage.id] || [];
  const hasUsersInContact = usersInContact.length > 0;
  const hasServiceUserService = contactMessage.serviceUserServiceId !== null;
  const hasNotification = contactMessage.isRead === false;

  const showServiceUserService = hasServiceUserService && contactMessage.serviceUserServiceId !== user?.id;

  useEffect(() => {
    const el = ref.current;

    if (!el) return;

    return draggable({
      element: el,
      getInitialData: () => ({ id: contactMessage.id }),
    });
  }, [contactMessage]);

  return (
    <DialogKanbanCard contactMessage={contactMessage}>
      <button
        ref={ref}
        className="outline-primary/30 hover:outline-primary hover:shadow-primary focus:shadow-primary focus:outline-primary bg-primary/10 relative flex w-full flex-col gap-2 rounded-sm p-2 text-left shadow outline transition-all"
      >
        <div className="grid grid-cols-[auto_min-content] items-start gap-2">
          <h4 className="truncate text-base font-bold">{contactMessage.name}</h4>
          <p className="text-muted-foreground text-sm whitespace-nowrap">{formattedPhoneNumber}</p>
        </div>
        <WhatsappChatContactMessage
          isIncoming={contactMessage.messageType === WhatsappMessageType.INCOMING}
          messageContentType={contactMessage.messageContentType}
        >
          {contactMessage.messageContent}
        </WhatsappChatContactMessage>
        {hasCategories && (
          <div className="flex flex-wrap gap-1">
            {contactMessage.categories.map((category) => (
              <Badge key={category.id}>{category.name}</Badge>
            ))}
          </div>
        )}
        {hasUsersInContact && (
          <div>
            <h5 className="text-xs">Visualizando</h5>
            <p className="text-sm">{usersInContact.map((user) => formatShortName(user.name)).join(", ")}</p>
          </div>
        )}
        {showServiceUserService && (
          <div>
            <h5 className="text-xs">Atendimento</h5>
            <p className="text-sm">{formatShortName(contactMessage.serviceUserServiceName!)}</p>
          </div>
        )}
        {hasNotification && <div className="bg-primary absolute -top-2 -right-2 h-4 w-4 self-start justify-self-end rounded-full"></div>}
      </button>
    </DialogKanbanCard>
  );
};
