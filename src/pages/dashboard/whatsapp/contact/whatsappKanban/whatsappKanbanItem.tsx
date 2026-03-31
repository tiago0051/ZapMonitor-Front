import { Badge } from "@/components/ui/badge";
import { formatAcronym } from "@/utils/formatString";
import { useEffect, useState, type DetailedHTMLProps, type FC } from "react";
import { WhatsappChatContactMessage } from "../../components/whatsappChatContactMessage";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { cn } from "@/lib/utils";
import { differenceInHours, differenceInMinutes, format } from "date-fns";
import parsePhoneNumberFromString from "libphonenumber-js";
import { FiClock } from "react-icons/fi";
import { AlertCircle } from "lucide-react";

type WhatsappKanbanItemProps = DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
  usersInContact: User[];
  contactMessage: WhatsappContactMessage;
};

export const WhatsappKanbanItem: FC<WhatsappKanbanItemProps> = ({ onClick, usersInContact, contactMessage, className, ...props }) => {
  const [expirationStatus, setExpirationStatus] = useState<{
    color: string;
    icon: string;
    label: string;
    urgent: boolean;
  } | null>(null);

  const getExpirationStatus = () => {
    if (!contactMessage.replyTimeExpiredAt) return null;

    const hours = differenceInHours(new Date(contactMessage.replyTimeExpiredAt), new Date());

    if (hours < 0) {
      return null;
    }

    if (hours < 2) {
      const minutes = differenceInMinutes(new Date(contactMessage.replyTimeExpiredAt), new Date());
      return {
        color: "bg-red-100 text-red-800 border-red-300",
        icon: "text-red-600",
        label: `${minutes}min`,
        urgent: true,
      };
    }

    if (hours < 6) {
      return {
        color: "bg-orange-100 text-orange-800 border-orange-300",
        icon: "text-orange-600",
        label: `${Math.round(hours)}h`,
        urgent: false,
      };
    }

    return {
      color: "bg-green-100 text-green-800 border-green-300",
      icon: "text-green-600",
      label: `${Math.round(hours)}h`,
      urgent: false,
    };
  };

  useEffect(() => {
    setExpirationStatus(getExpirationStatus());

    const timerId =
      contactMessage.replyTimeExpiredAt &&
      setTimeout(() => {
        setExpirationStatus(getExpirationStatus());
      }, 1000 * 60);
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, []);

  const isIncoming = contactMessage.messageType === WhatsappMessageType.INCOMING;

  const parsedPhoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);

  return (
    <div className="py-[6px] pr-8 pl-4 first:pt-3" {...props}>
      <div
        className={cn(className, "bg-background cursor-pointer gap-4 overflow-hidden rounded-xl border p-4 hover:brightness-125")}
        onClick={onClick}
      >
        <div className="mb-2">
          <div className="flex w-full items-center justify-between">
            <h3 className="font-bold">{contactMessage.surname || contactMessage.name}</h3>
            <div className="flex items-center gap-2">
              {expirationStatus && (
                <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", expirationStatus.color)}>
                  <AlertCircle className={cn("h-3 w-3", expirationStatus.icon)} />
                  {expirationStatus.label}
                </Badge>
              )}
              {contactMessage.isRead === false && <div className="bg-primary h-2 w-2 rounded-full"></div>}
            </div>
          </div>
          <p className="text-foreground/50 text-xs">{parsedPhoneNumber?.format("INTERNATIONAL")}</p>
        </div>
        <WhatsappChatContactMessage isIncoming={isIncoming} messageContentType={contactMessage.messageContentType}>
          {contactMessage.messageContent}
        </WhatsappChatContactMessage>

        <div className="mt-2 flex flex-wrap gap-1">
          {contactMessage.categories.map((category) => (
            <Badge key={category.id} variant="outline">
              {category.name}
            </Badge>
          ))}
        </div>

        {(contactMessage.serviceUserServiceName || usersInContact.length > 0) && (
          <div className="mt-3 grid grid-cols-[auto_44px]">
            {contactMessage.serviceUserServiceName && (
              <p className="text-xs">Em atendimento por: {contactMessage.serviceUserServiceName}</p>
            )}
            <div className="col-start-2 flex flex-wrap justify-end gap-1">
              {usersInContact.map((user) => (
                <div
                  className="bg-secondary text-secondary-foreground flex h-5 w-5 items-center justify-center rounded-full text-xs uppercase"
                  key={user.id}
                >
                  <span>{formatAcronym(user.name)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-2 flex items-center gap-1">
          <FiClock size={12} />
          <span className="text-xs whitespace-nowrap">{format(contactMessage.messageCreatedAt, "dd/MM/yy HH:mm")}</span>
        </div>
      </div>
    </div>
  );
};
