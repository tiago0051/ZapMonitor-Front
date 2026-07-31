import { Badge } from "@/components/ui/badge";
import { useCallback, useMemo, type DetailedHTMLProps, type FC } from "react";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { cn } from "@/lib/utils";
import { differenceInHours, differenceInMinutes } from "date-fns";
import { AlertCircle } from "lucide-react";
import { Message } from "./components/message";
import { ContactAvatar } from "@/components/contact-avatar";

type ContactCardProps = DetailedHTMLProps<React.HTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & {
  contact: WhatsappContactMessage;
  active: boolean;
};

export const ContactCard: FC<ContactCardProps> = ({ contact, active, onClick }) => {
  const getExpirationStatus = useCallback(() => {
    if (!contact.replyTimeExpiredAt) return null;

    const minutes = differenceInMinutes(new Date(contact.replyTimeExpiredAt), new Date());
    const hours = differenceInHours(new Date(contact.replyTimeExpiredAt), new Date());

    if (minutes < 0) {
      return null;
    }

    if (hours < 2) {
      const minutes = differenceInMinutes(new Date(contact.replyTimeExpiredAt), new Date());
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
  }, [contact.replyTimeExpiredAt]);

  const expirationStatus = useMemo(() => getExpirationStatus(), [getExpirationStatus]);
  const isIncoming = contact.messageType === WhatsappMessageType.INCOMING;

  const nameToPresentation = contact.surname?.trim() || contact.name?.trim() || "Sem nome";

  return (
    <button
      onClick={onClick}
      className={`border-border w-full border-b px-4 py-3 text-left transition-colors ${
        active ? "border-l-2 border-l-green-500 bg-green-50" : "border-l-2 border-l-transparent hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <ContactAvatar contact={contact} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-1">
            <span className="text-foreground truncate text-sm font-semibold">{nameToPresentation}</span>
            {expirationStatus && (
              <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", expirationStatus.color)}>
                <AlertCircle className={cn("h-3 w-3", expirationStatus.icon)} />
                {expirationStatus.label}
              </Badge>
            )}
          </div>
          <Message isIncoming={isIncoming} messageContentType={contact.messageContentType}>
            {contact.messageContent}
          </Message>
          <div className="flex flex-wrap items-center gap-1.5">
            {contact.categories &&
              contact.categories.slice(0, 2).map((t) => (
                <span
                  key={t.id}
                  className="text-muted-foreground bg-muted flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none font-medium"
                >
                  {t.name}
                </span>
              ))}
            {contact.categories && contact.categories.length > 2 && (
              <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold">
                +{contact.categories.length - 2}
              </span>
            )}
            {!contact.isRead && (
              <span className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                {" "}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};
