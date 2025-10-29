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
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { useClientContext } from "@/context/ClientContext/clientContext.ts";

type WhatsappChatMessageHeaderProps = {
  contactMessage: WhatsappContactMessage;
  className?: string;
};

export const WhatsappChatMessageHeader = ({ contactMessage, className }: WhatsappChatMessageHeaderProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { client } = useClientContext();

  const [newSurname, setNewSurname] = useState<string | null>(null);

  const updateWhatsappContactMutation = useMutation({
    mutationFn: whatsappService.updateContact,
    onError: requestErrorHandling,
    onSuccess: () => {
      navigate(0);
      toast.success("Nome salvo com sucesso");
    },
  });

  const parsedPhoneNumber = parsePhoneNumberFromString(contactMessage.phoneNumber);
  const hasNewSurname = !!newSurname && newSurname !== contactMessage.name;

  const isLoading = updateWhatsappContactMutation.isPending;

  return (
    <div className={cn("flex flex-col gap-2 md:flex-row justify-between", className)}>
      <div className={"flex flex-col gap-2 order-2 md:order-0"}>
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
