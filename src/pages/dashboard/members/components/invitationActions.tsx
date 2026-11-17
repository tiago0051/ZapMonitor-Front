import { Button } from "@/components/ui/button";
import { memberService } from "@/services/api/memberService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Loader2, Send } from "lucide-react";
import { useRef, type FC } from "react";
import { toast } from "sonner";
import { DialogCancelInvitation } from "./dialogCancelInvitation";

type InvitationActionsProps = {
  clientId: string;
  invitationId: string;
  email: string;
};

/**
 * Copia o link sem perder o "gesto" do clique: o Safari só deixa escrever na área de transferência dentro dele,
 * então o ClipboardItem recebe a promessa da busca do link.
 */
const copyInvitationLink = async (loadUrl: () => Promise<string>): Promise<string | null> => {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    let url: string | null = null;
    const blob = loadUrl().then((value) => {
      url = value;
      return new Blob([value], { type: "text/plain" });
    });
    await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
    return url;
  }

  const url = await loadUrl();
  await navigator.clipboard.writeText(url);
  return url;
};

export const InvitationActions: FC<InvitationActionsProps> = ({ clientId, invitationId, email }) => {
  const queryClient = useQueryClient();
  const params = { clientId, invitationId };

  const resend = useMutation({
    mutationFn: memberService.resendInvitation,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      toast.success(`Convite reenviado para ${email}. Ele vale por mais 7 dias.`);
    },
  });

  const loadedUrl = useRef<string | null>(null);
  const loadUrl = async () => {
    const link = await memberService.findInvitationLink({ params });
    loadedUrl.current = link.url;
    return link.url;
  };

  const copyLink = useMutation({
    mutationFn: () => {
      loadedUrl.current = null;
      return copyInvitationLink(loadUrl);
    },
    onSuccess: () => toast.success("Link copiado. Envie para a pessoa por WhatsApp ou outro canal; ela entra com o e-mail convidado."),
    onError: (error) => {
      // Sem permissão para a área de transferência: mostra o link para copiar à mão
      if (loadedUrl.current) toast("Copie o link do convite", { description: loadedUrl.current, duration: 20000 });
      else requestErrorHandling(error);
    },
  });

  return (
    <div className="flex flex-wrap justify-end gap-1">
      <Button variant="ghost" size="sm" onClick={() => resend.mutate({ params })} disabled={resend.isPending}>
        {resend.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Reenviar e-mail
      </Button>
      <Button variant="ghost" size="sm" onClick={() => copyLink.mutate()} disabled={copyLink.isPending}>
        {copyLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
        Copiar link do convite
      </Button>
      <DialogCancelInvitation clientId={clientId} invitationId={invitationId} />
    </div>
  );
};
