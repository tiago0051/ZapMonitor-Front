import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { clientService } from "@/services/api/clientService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { RefreshCcw } from "lucide-react";
import { useState } from "react";
import { AlertDialogCopySecret } from "./components/alertDialogCopySecret";

export const ClientConfiguration = () => {
  const { client } = useClientContext();

  const [newClientSecret, setNewClientSecret] = useState("");

  const generateNewSecretMutation = useMutation({
    mutationFn: clientService.generateNewSecret,
    onSuccess: (data) => {
      setNewClientSecret(data);
    },
    onError: requestErrorHandling,
  });
  return (
    <div>
      <AlertDialogCopySecret secret={newClientSecret} onClose={() => setNewClientSecret("")} />

      <Button variant={"ghost"} onClick={() => generateNewSecretMutation.mutate({ params: { clientId: client.id } })}>
        <RefreshCcw />
      </Button>
    </div>
  );
};
