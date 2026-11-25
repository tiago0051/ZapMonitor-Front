import { Button } from "@/components/ui/button";
import { emailSendingService } from "@/services/api/emailSendingService";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CheckCircle2, MailX } from "lucide-react";
import { type FC, useEffect } from "react";
import { useParams } from "react-router";
import { PublicMessage } from "./publicMessage";

/**
 * Descadastro pelo link do e-mail: a pessoa confirma antes (leitores de link não descadastram ninguém) e a API registra.
 */
export const EmailUnsubscribe: FC = () => {
  const { token = "" } = useParams();
  const unsubscribe = useMutation({ mutationFn: () => emailSendingService.unsubscribe(token) });

  useEffect(() => {
    document.title = "Descadastrar";
  }, []);

  if (unsubscribe.isSuccess)
    return (
      <PublicMessage icon={CheckCircle2} title="Pronto">
        {unsubscribe.data.email} não vai mais receber estes e-mails.
      </PublicMessage>
    );

  if (isAxiosError(unsubscribe.error) && unsubscribe.error.response?.status === 404)
    return (
      <PublicMessage icon={MailX} title="Link inválido">
        Este link de descadastro não é válido ou foi alterado.
      </PublicMessage>
    );

  return (
    <PublicMessage icon={MailX} title="Não quer mais receber estes e-mails?">
      <p className="mb-5">Confirme para parar de receber os e-mails deste remetente.</p>
      <Button onClick={() => unsubscribe.mutate()} disabled={unsubscribe.isPending}>
        {unsubscribe.isPending ? "Descadastrando..." : "Descadastrar"}
      </Button>
      {unsubscribe.isError && (
        <p className="text-destructive mt-3 text-sm">Não foi possível descadastrar agora. Verifique sua conexão e tente de novo.</p>
      )}
    </PublicMessage>
  );
};
