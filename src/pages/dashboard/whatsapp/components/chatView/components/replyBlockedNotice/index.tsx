import { Button } from "@/components/ui/button";
import { CheckCircle2, Inbox, Lock, MessagesSquare } from "lucide-react";
import type { FC } from "react";
import type { ServiceActions } from "../../hooks/useServiceActions";
import { useNextConversation } from "../../hooks/useNextConversation";

type ReplyBlockedNoticeProps = {
  contact: WhatsappContactMessage;
  contactService: WhatsappContactService;
  serviceActions: ServiceActions;
};

/** Depois de encerrar: confirma e leva o atendente à próxima conversa, sem voltar para a lista. */
const ServiceEndedNotice: FC<{ contact: WhatsappContactMessage; serviceActions: ServiceActions }> = ({ contact, serviceActions }) => {
  const { openNextMine, openNextFromQueue, loadingTab } = useNextConversation(contact.id);

  return (
    <div role="status" className="border-border flex flex-col gap-3 rounded-lg border bg-green-50/60 px-4 py-3 dark:bg-green-950/20">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        <p className="text-foreground min-w-0 flex-1 text-sm font-medium">Atendimento encerrado</p>
        {serviceActions.canAssumeService && (
          <Button size="sm" variant="ghost" onClick={serviceActions.assumeService} disabled={serviceActions.isPending}>
            Assumir de novo
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="sm" className="sm:flex-1" onClick={openNextMine} disabled={loadingTab !== null}>
          <MessagesSquare className="h-4 w-4" />
          {loadingTab === "mine" ? "Abrindo..." : "Abrir próxima dos Meus"}
        </Button>
        <Button size="sm" variant="outline" className="sm:flex-1" onClick={openNextFromQueue} disabled={loadingTab !== null}>
          <Inbox className="h-4 w-4" />
          {loadingTab === "queue" ? "Abrindo..." : "Abrir próximo da fila"}
        </Button>
      </div>
    </div>
  );
};

/** Explica, no lugar da barra de mensagem, por que o atendente ainda não pode responder. */
export const ReplyBlockedNotice: FC<ReplyBlockedNoticeProps> = ({ contact, contactService, serviceActions }) => {
  if (serviceActions.hasJustEnded) return <ServiceEndedNotice contact={contact} serviceActions={serviceActions} />;

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
