import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { FC } from "react";

type AlertDialogRemoveAiIntegrationProps = {
  providerName: string;
  isPending: boolean;
  onConfirm: () => void;
};

export const AlertDialogRemoveAiIntegration: FC<AlertDialogRemoveAiIntegrationProps> = ({ providerName, isPending, onConfirm }) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive" disabled={isPending}>
          Remover
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover {providerName}?</AlertDialogTitle>
          <AlertDialogDescription>
            A credencial e as configurações serão apagadas de vez e a IA deixará de usar esta integração. Para voltar a usá-la, será preciso
            conectar de novo.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90 text-white">
            Remover
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
