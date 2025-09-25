import { Button } from "@/components/ui/button";
import { DialogLinkMessageCategory } from "./components/dialogLinkMessageCategory";
import { FiArrowLeft } from "react-icons/fi";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import parsePhoneNumberFromString from "libphonenumber-js";

type WhatsappChatMessageHeaderProps = {
  contactMessage: WhatsappContactMessage;
  onBack?: () => void;
  className?: string;
};

export const WhatsappChatMessageHeader = ({ contactMessage, onBack, className }: WhatsappChatMessageHeaderProps) => {
  const isMobile = useIsMobile();

  const parsedPhoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);

  return (
    <div className={cn("flex items-center justify-between border-b pb-4 sm:px-4", className)}>
      <div className="">
        {isMobile && onBack && (
          <Button variant={"link"} className="p-0" onClick={onBack} aria-label="Voltar">
            <FiArrowLeft />
          </Button>
        )}
        <div>
          <p className="text-xl">{contactMessage.name}</p>
          <p className="text-lg">{parsedPhoneNumber?.formatNational()}</p>
        </div>
      </div>

      <div>
        <DialogLinkMessageCategory contactMessage={contactMessage} categories={contactMessage.categories} />
      </div>
    </div>
  );
};
