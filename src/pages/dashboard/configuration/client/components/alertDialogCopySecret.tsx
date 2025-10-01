import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

type AlertDialogCopySecretProps = {
  secret: string | null;
  onClose: () => void;
};

export const AlertDialogCopySecret = ({
  secret,
  onClose,
}: AlertDialogCopySecretProps) => {
  function downloadSecret() {
    const element = document.createElement("a");
    const file = new Blob([secret || ""], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = "secret.txt";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    onClose();
  }

  return (
    <AlertDialog open={!!secret}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Baixe a secret</AlertDialogTitle>
          <AlertDialogDescription>
            Baixe a secret gerada para o cliente.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Input value={secret || ""} readOnly />

        <AlertDialogFooter>
          <AlertDialogAction onClick={downloadSecret}>Baixar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
