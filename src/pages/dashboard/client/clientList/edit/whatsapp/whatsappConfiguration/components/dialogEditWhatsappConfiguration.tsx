import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogDescription } from "@radix-ui/react-dialog";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Edit } from "lucide-react";

type DialogEditWhatsappConfigurationProps = {
  whatsappConfiguration: WhatsappConfiguration;
};

export const DialogEditWhatsappConfiguration = ({
  whatsappConfiguration,
}: DialogEditWhatsappConfigurationProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={"ghost"}>
          <Edit />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {parsePhoneNumberFromString(
              whatsappConfiguration.phoneNumber
            )?.format("INTERNATIONAL")}
          </DialogTitle>
          <DialogDescription>
            Altera a configuração de integração com o WhatsApp
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
