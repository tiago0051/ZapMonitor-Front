import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useParams } from "react-router";
import { DialogCreateWhatsappTemplate } from "./components/dialogCreateWhatsappTemplate";

export const WhatsappTemplate = () => {
  const { clientId } = useParams();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nomes de Templates</CardTitle>
        <CardDescription>
          Cadastre nomes de templates do WhatsApp para este cliente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end">
          <DialogCreateWhatsappTemplate clientId={clientId!} />
        </div>
      </CardContent>
    </Card>
  );
};
