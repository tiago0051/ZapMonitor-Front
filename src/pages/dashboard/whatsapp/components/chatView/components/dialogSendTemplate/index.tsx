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
  contactService: WhatsappContactService;
  whatsappConfigurationId: string;
};

export const DialogSendTemplate = ({ contactService, whatsappConfigurationId }: DialogSendTemplateProps) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TemplateDraft>(emptyTemplateDraft);
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const sendTemplateMutation = useMutation({
    mutationFn: async (value: TemplateDraft) =>
      whatsappService.sendTemplate({
        params: {
          clientId: client.id,
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
        },
        body: await buildTemplateSendBody(client.id, whatsappConfigurationId, value),
      }),
    onSuccess: () => {
      toast.success("Modelo enviado");

      queryClient.invalidateQueries({ queryKey: [`contact-${contactService.id}`] });
      queryClient.invalidateQueries({ queryKey: ["whatsappContacts"] });

      setOpen(false);
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
      <DialogTrigger asChild>
        <Button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-green-600 py-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800">
          <SendHorizontal className="h-5 w-5" />
          <span>Enviar template</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Enviar modelo</DialogTitle>
          <DialogDescription>A janela de 24 horas fechou: só um modelo aprovado pela Meta pode retomar a conversa.</DialogDescription>
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
