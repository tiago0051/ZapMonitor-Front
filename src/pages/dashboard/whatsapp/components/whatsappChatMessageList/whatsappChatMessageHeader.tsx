import { Button } from "@/components/ui/button";
import { DialogLinkMessageCategory } from "./components/dialogLinkMessageCategory";
import { FiCheckCircle } from "react-icons/fi";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Input } from "@/components/ui/input.tsx";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService.ts";
import { requestErrorHandling } from "@/utils/request.tsx";
import { toast } from "sonner";
import { useClientContext } from "@/context/ClientContext/clientContext.ts";

type WhatsappChatMessageHeaderProps = {
  contactMessage: WhatsappContactMessage;
  className?: string;
};

export const WhatsappChatMessageHeader = ({ contactMessage, className }: WhatsappChatMessageHeaderProps) => {
  const isMobile = useIsMobile();
  const { client } = useClientContext();

  const [newSurname, setNewSurname] = useState<string | null>(null);

  const updateWhatsappContactMutation = useMutation({
    mutationFn: whatsappService.updateContact,
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("Nome salvo com sucesso");
    },
  });

  const parsedPhoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);
  const hasNewSurname = !!newSurname && newSurname !== contactMessage.surname;

  const isLoading = updateWhatsappContactMutation.isPending;

  return (
    <div className={cn("flex flex-col justify-between gap-2 md:flex-row", className)}>
      <div className={"order-2 flex flex-col gap-2 md:order-0"}>
        <div className={"flex gap-1"}>
          <Input
            disabled={isLoading}
            data-changed={hasNewSurname}
            defaultValue={contactMessage.surname}
            onChange={(e) => setNewSurname(e.target.value)}
          />
          {hasNewSurname && (
            <Button
              size={"icon"}
              onClick={() =>
                updateWhatsappContactMutation.mutate({
                  params: {
                    clientId: client.id,
                    contactId: contactMessage.id,
                  },
                  body: {
                    surname: newSurname,
                  },
                })
              }
            >
              <FiCheckCircle />
            </Button>
          )}
        </div>

        {!isMobile && <p className="text-lg">{parsedPhoneNumber?.formatNational()}</p>}
      </div>

      <div className={"order-1"}>
        <DialogLinkMessageCategory contactMessage={contactMessage} categories={contactMessage.categories} />
      </div>
    </div>
  );
};
