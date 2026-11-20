import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { requestErrorHandling } from "@/utils/request";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";
import { TemplateComposer } from "@/components/whatsappTemplate/templateComposer";
import {
  buildTemplateSendBody,
  emptyTemplateDraft,
  templateDraftError,
  type TemplateDraft,
} from "@/components/whatsappTemplate/templateUtils";

type DialogSendTemplateProps = {
  contactId: string;
  whatsappConfigurationId: string;
  // false: o atendimento está com a janela de 24h aberta e o modelo vai junto das mensagens normais
  windowExpired?: boolean;
  // Controle de fora (ex.: item do menu de anexos); sem isso o diálogo usa o próprio botão
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const DialogSendTemplate = ({
  contactId,
  whatsappConfigurationId,
  windowExpired = true,
  open: controlledOpen,
  onOpenChange,
}: DialogSendTemplateProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean) => (isControlled ? onOpenChange?.(value) : setInternalOpen(value));
  const [draft, setDraft] = useState<TemplateDraft>(emptyTemplateDraft);
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const sendTemplateMutation = useMutation({
    mutationFn: async (value: TemplateDraft) =>
      whatsappService.sendTemplate({
        params: {
          clientId: client.id,
          contactId,
          configurationId: whatsappConfigurationId,
        },
        body: await buildTemplateSendBody(client.id, whatsappConfigurationId, value),
      }),
    onSuccess: () => {
      toast.success("Modelo enviado");

      queryClient.invalidateQueries({ queryKey: [`contact-${contactId}`] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "contactsStats"] });

      changeOpen(false);
    },
    onError: requestErrorHandling,
  });

  const changeOpen = (value: boolean) => {
    setOpen(value);
    if (!value) setDraft(emptyTemplateDraft);
  };

  const error = templateDraftError(draft);

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-green-600 py-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800">
            <SendHorizontal className="h-5 w-5" />
            <span>Enviar template</span>
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar modelo</DialogTitle>
          <DialogDescription>
            {windowExpired
              ? "A janela de 24 horas fechou: só um modelo aprovado pela Meta pode retomar a conversa."
              : "Envie um modelo aprovado pela Meta nesta conversa. Ele é cobrado pela Meta conforme a categoria."}
          </DialogDescription>
        </DialogHeader>

        {open && (
          <TemplateComposer
            clientId={client.id}
            configurationId={whatsappConfigurationId}
            value={draft}
            onChange={setDraft}
            disabled={sendTemplateMutation.isPending}
          />
        )}

        <DialogFooter className="items-center gap-2">
          {draft.template && error && <p className="text-muted-foreground mr-auto text-xs">{error}</p>}
          <Button disabled={!!error || sendTemplateMutation.isPending} onClick={() => sendTemplateMutation.mutate(draft)}>
            {sendTemplateMutation.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
