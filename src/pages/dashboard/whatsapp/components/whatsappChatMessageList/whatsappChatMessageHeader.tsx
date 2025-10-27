import { Button } from "@/components/ui/button";
import { DialogLinkMessageCategory } from "./components/dialogLinkMessageCategory";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
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
  onBack?: () => void;
  className?: string;
};

export const WhatsappChatMessageHeader = ({ contactMessage, onBack, className }: WhatsappChatMessageHeaderProps) => {
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
    <div className={cn("flex justify-between border-b py-1 pb-4 sm:px-4", className)}>
      <div className={"flex flex-col gap-2"}>
        {isMobile && onBack && (
          <Button variant={"link"} className="p-0" onClick={onBack} aria-label="Voltar">
            <FiArrowLeft />
          </Button>
        )}
        <div>
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
        </div>

        <p className="text-lg">{parsedPhoneNumber?.formatNational()}</p>
      </div>

      <div>
        <DialogLinkMessageCategory contactMessage={contactMessage} categories={contactMessage.categories} />
      </div>
    </div>
  );
};
