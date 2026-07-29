import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templateService } from "@/services/api/templateService";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { requestErrorHandling } from "@/utils/request";
import { SendHorizontal } from "lucide-react";
import { toast } from "sonner";

type DialogSendTemplateProps = {
  contactService: WhatsappContactService;
  whatsappConfigurationId: string;
};

export const DialogSendTemplate = ({ contactService, whatsappConfigurationId }: DialogSendTemplateProps) => {
  const [open, setOpen] = useState(false);
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", client.id],
    queryFn: () => templateService.findAll({ params: { clientId: client.id } }),
    enabled: open,
  });

  const sendTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      whatsappService.sendTemplate({
        params: {
          clientId: client.id,
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
        },
        body: {
          templateId,
        },
      }),
    onSuccess: () => {
      toast.success("Template enviado com sucesso!");

      queryClient.invalidateQueries({
        queryKey: [`contact-${contactService.id}`],
      });

      queryClient.invalidateQueries({
        queryKey: ["whatsappContacts"],
      });

      setOpen(false);
    },
    onError: requestErrorHandling,
  });

  const templates = templatesQuery.data || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-green-600 py-5 text-base font-medium text-white shadow-sm transition-colors hover:bg-green-700 active:bg-green-800">
          <SendHorizontal className="h-5 w-5" />
          <span>Enviar template</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          {templatesQuery.isLoading && <p className="text-muted-foreground text-sm">Carregando templates...</p>}
          {!templatesQuery.isLoading && templates.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum template encontrado.</p>
          )}
          {templates.map((template) => (
            <div key={template.id} className="hover:bg-accent/50 flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-semibold">{template.name}</p>
                {template.description && <p className="text-muted-foreground text-xs">{template.description}</p>}
              </div>
              <Button size="sm" disabled={sendTemplateMutation.isPending} onClick={() => sendTemplateMutation.mutate(template.id)}>
                Enviar
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
