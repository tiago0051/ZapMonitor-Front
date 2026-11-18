import { useConfirm } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, MessageCircle } from "lucide-react";
import type { FC, ReactNode } from "react";
import { toast } from "sonner";

const emailReasonLabel: Record<EmailSuppressionReason, string> = {
  UNSUBSCRIBE: "a pessoa se descadastrou",
  BOUNCE: "o e-mail voltou",
  COMPLAINT: "marcou como spam",
  MANUAL: "descadastrado à mão",
};

const whatsappSourceLabel: Record<string, string> = {
  KEYWORD: "pediu para sair por mensagem",
  BUTTON: "tocou no botão de sair",
  MANUAL: "descadastrado à mão",
};

const ConsentBadge: FC<{ receives: boolean }> = ({ receives }) => (
  <Badge
    variant="secondary"
    className={cn(
      receives
        ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
        : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    )}
  >
    {receives ? "Sim" : "Não"}
  </Badge>
);

const Row: FC<{ icon: ReactNode; label: string; receives: boolean; detail?: ReactNode; action?: ReactNode }> = ({
  icon,
  label,
  receives,
  detail,
  action,
}) => (
  <div className="flex flex-wrap items-center gap-2 text-sm">
    <span className="text-muted-foreground shrink-0">{icon}</span>
    <span className="min-w-0 flex-1">
      {label}: <ConsentBadge receives={receives} />
      {detail && <span className="text-muted-foreground block text-xs">{detail}</span>}
    </span>
    {action}
  </div>
);

/**
 * Se a pessoa recebe marketing por WhatsApp e por e-mail, com descadastrar/recadastrar. As mesmas listas da aba
 * "Descadastrados" das campanhas; mensagens de utilidade (lembretes, cobranças) não dependem disso.
 */
export const ContactConsentSection: FC<{ contact: ContactDetail }> = ({ contact }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  // Telefones, conversas e e-mails da ficha entram na chave: ao mudar, o selo é lido de novo
  const identifiers = [
    ...contact.phones.map((item) => item.phoneNumber),
    ...contact.conversations.map((item) => item.id),
    ...contact.emails.map((item) => item.email),
  ].join("|");
  const queryKey = ["contacts", "consent", client.id, contact.id, identifiers];

  const consentQuery = useQuery({
    queryKey,
    queryFn: () => contactService.findConsent(client.id, contact.id),
  });

  const onSaved = (consent: ContactConsent) => {
    queryClient.setQueryData(queryKey, consent);
    queryClient.invalidateQueries({ queryKey: ["broadcastOptOuts", client.id] });
    queryClient.invalidateQueries({ queryKey: ["emailSending", "suppressions", client.id] });
  };

  const setWhatsapp = useMutation({
    mutationFn: (subscribed: boolean) => contactService.setWhatsappConsent(client.id, contact.id, subscribed),
    onError: requestErrorHandling,
    onSuccess: (consent, subscribed) => {
      onSaved(consent);
      toast.success(subscribed ? "Volta a receber marketing pelo WhatsApp" : "Descadastrado do marketing pelo WhatsApp");
    },
  });
  const setEmail = useMutation({
    mutationFn: (body: { email: string; subscribed: boolean }) => contactService.setEmailConsent(client.id, contact.id, body),
    onError: requestErrorHandling,
    onSuccess: (consent, body) => {
      onSaved(consent);
      toast.success(body.subscribed ? `${body.email} volta a receber e-mails` : `${body.email} descadastrado`);
    },
  });

  const consent = consentQuery.data;
  if (!consent) return null;

  const canEditWhatsapp = can("broadcasts.send");
  const canEditEmail = can("emailSettings.manage");
  const optedOutPhone = consent.whatsapp.phones.find((phone) => phone.optedOut);

  const changeWhatsapp = async (subscribed: boolean) => {
    const ok = await confirm({
      title: subscribed ? "Recadastrar no WhatsApp?" : "Descadastrar do WhatsApp?",
      description: subscribed
        ? "Só recadastre se a pessoa pediu para voltar a receber. Ela volta a receber campanhas de marketing."
        : "A pessoa deixa de receber campanhas de marketing pelo WhatsApp, em todos os números da ficha. Lembretes e cobranças continuam.",
      confirmLabel: subscribed ? "Recadastrar" : "Descadastrar",
      destructive: !subscribed,
    });
    if (ok) setWhatsapp.mutate(subscribed);
  };

  const changeEmail = async (email: string, subscribed: boolean) => {
    const ok = await confirm({
      title: subscribed ? `Recadastrar ${email}?` : `Descadastrar ${email}?`,
      description: subscribed
        ? "Só recadastre se a pessoa pediu para voltar a receber. Ela volta a receber campanhas e sequências."
        : "Este e-mail deixa de receber campanhas e sequências.",
      confirmLabel: subscribed ? "Recadastrar" : "Descadastrar",
      destructive: !subscribed,
    });
    if (ok) setEmail.mutate({ email, subscribed });
  };

  return (
    <div className="grid gap-2">
      {confirmDialog}
      <Row
        icon={<MessageCircle className="h-3.5 w-3.5" />}
        label="Recebe marketing por WhatsApp"
        receives={consent.whatsapp.receivesMarketing}
        detail={
          consent.whatsapp.phones.length === 0
            ? "Sem telefone na ficha."
            : optedOutPhone &&
              `${whatsappSourceLabel[optedOutPhone.source ?? ""] ?? "descadastrado"}${optedOutPhone.optedOutAt ? ` em ${format(new Date(optedOutPhone.optedOutAt), "dd/MM/yyyy")}` : ""}`
        }
        action={
          canEditWhatsapp &&
          consent.whatsapp.phones.length > 0 && (
            <Button variant="outline" size="sm" disabled={setWhatsapp.isPending} onClick={() => changeWhatsapp(!!optedOutPhone)}>
              {optedOutPhone ? "Recadastrar" : "Descadastrar"}
            </Button>
          )
        }
      />
      {consent.email.emails.length === 0 ? (
        <Row icon={<Mail className="h-3.5 w-3.5" />} label="Recebe marketing por e-mail" receives={false} detail="Sem e-mail na ficha." />
      ) : (
        consent.email.emails.map((item) => (
          <Row
            key={item.email}
            icon={<Mail className="h-3.5 w-3.5" />}
            label={consent.email.emails.length > 1 ? `E-mail ${item.email}` : "Recebe marketing por e-mail"}
            receives={!item.suppressed}
            detail={
              item.suppressed &&
              `${item.reason ? emailReasonLabel[item.reason] : "descadastrado"}${item.suppressedAt ? ` em ${format(new Date(item.suppressedAt), "dd/MM/yyyy")}` : ""}${item.canResubscribe ? "" : "; não dá para recadastrar"}`
            }
            action={
              canEditEmail &&
              (!item.suppressed || item.canResubscribe) && (
                <Button variant="outline" size="sm" disabled={setEmail.isPending} onClick={() => changeEmail(item.email, item.suppressed)}>
                  {item.suppressed ? "Recadastrar" : "Descadastrar"}
                </Button>
              )
            }
          />
        ))
      )}
    </div>
  );
};
