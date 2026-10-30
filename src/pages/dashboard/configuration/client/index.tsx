import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { clientService } from "@/services/api/clientService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { AlertDialogCopySecret } from "./components/alertDialogCopySecret";

export const ClientConfiguration = () => {
  const { client } = useClientContext();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [newClientSecret, setNewClientSecret] = useState("");

  const generateNewSecretMutation = useMutation({
    mutationFn: clientService.generateNewSecret,
    onSuccess: (data) => {
      setIsConfirmOpen(false);
      setNewClientSecret(data);
    },
    onError: requestErrorHandling,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>API de envio</CardTitle>
        <CardDescription>
          Sistemas externos enviam mensagens e listas por API usando o ID do cliente e uma chave secreta (autenticação Basic).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-semibold">ID do cliente</p>
          <p className="bg-muted rounded-md p-2 font-mono text-sm break-all">{client.id}</p>
        </div>

        <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <KeyRound className="h-4 w-4" />
              Gerar nova chave secreta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar nova chave secreta?</DialogTitle>
              <DialogDescription>
                A chave atual deixa de funcionar imediatamente. Atualize os sistemas integrados com a nova chave logo após gerá-la.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)} disabled={generateNewSecretMutation.isPending}>
                Cancelar
              </Button>
              <Button
                onClick={() => generateNewSecretMutation.mutate({ params: { clientId: client.id } })}
                disabled={generateNewSecretMutation.isPending}
              >
                Gerar chave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialogCopySecret secret={newClientSecret} onClose={() => setNewClientSecret("")} />
      </CardContent>
    </Card>
  );
};
