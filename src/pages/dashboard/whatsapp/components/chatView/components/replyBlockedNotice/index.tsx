import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import type { FC } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";

type ReplyBlockedNoticeProps = {
  contactService: WhatsappContactService;
  serviceActions: ServiceActions;
};

/** Explica, no lugar da barra de mensagem, por que o atendente ainda não pode responder. */
export const ReplyBlockedNotice: FC<ReplyBlockedNoticeProps> = ({ contactService, serviceActions }) => {
  if (!serviceActions.canAssumeService) return null;

  const message = contactService.isInService
    ? "Este contato já está em outro atendimento. Assuma para responder."
    : "Assuma o atendimento para responder este contato.";

  return (
    <div className="bg-muted/60 border-border flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
      <Lock className="text-muted-foreground h-4 w-4 shrink-0" />
      <p className="text-foreground min-w-0 flex-1 text-sm">{message}</p>
      <Button size="sm" onClick={serviceActions.assumeService} disabled={serviceActions.isPending}>
        Assumir atendimento
      </Button>
    </div>
  );
};
