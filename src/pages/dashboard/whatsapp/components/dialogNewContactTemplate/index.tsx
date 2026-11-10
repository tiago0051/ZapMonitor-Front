import { useEffect, useState, type FC, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isValidPhoneNumber } from "libphonenumber-js";
import { MessageSquarePlus } from "lucide-react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { TemplateComposer } from "@/components/whatsappTemplate/templateComposer";
import {
  buildTemplateSendBody,
  emptyTemplateDraft,
  templateDraftError,
  type TemplateDraft,
} from "@/components/whatsappTemplate/templateUtils";
import { formatConfigurationPhoneNumber, isWhatsappWeb, WHATSAPP_WEB_TEMPLATE_HINT } from "@/utils/whatsappConfiguration";

type DialogNewContactTemplateProps = {
  onSent: (contact: WhatsappContactMessage) => void;
  // Abrindo pela ficha: telefone e nome já preenchidos e o botão de quem chamou
  defaultPhone?: string;
  defaultName?: string;
  trigger?: ReactNode;
};

const schema = z.object({
  phoneNumber: z
    .string()
    .min(1, "O telefone é obrigatório")
    .refine((value) => isValidPhoneNumber(value, "BR"), "Número de telefone inválido"),
  name: z.string().optional(),
  configurationId: z.string().min(1, "Selecione o número de envio"),
});

type SchemaType = z.infer<typeof schema>;

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const DialogNewContactTemplate: FC<DialogNewContactTemplateProps> = ({ onSent, defaultPhone, defaultName, trigger }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<TemplateDraft>(emptyTemplateDraft);

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
    enabled: isOpen,
  });

  const enabledConfigurations = (configurationsQuery.data?.items || []).filter((configuration) => configuration.enabled);
  // Modelos da Meta só saem pela API oficial
  const configurations = enabledConfigurations.filter((configuration) => !isWhatsappWeb(configuration));
  const whatsappWebConfigurations = enabledConfigurations.filter(isWhatsappWeb);

  const sendTemplateToNewContact = useMutation({
    mutationFn: async (data: SchemaType) =>
      whatsappService.sendTemplateToNewContact({
        params: { clientId: client.id },
        body: { ...data, ...(await buildTemplateSendBody(client.id, data.configurationId, draft)) },
      }),
    onError: requestErrorHandling,
    onSuccess: (contact) => {
      toast.success("Template enviado com sucesso!");

      queryClient.invalidateQueries({ queryKey: ["whatsapp", "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "contactsStats"] });

      changeOpen(false);
      onSent(contact);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      phoneNumber: "",
      name: "",
      configurationId: "",
    },
    disabled: sendTemplateToNewContact.isPending,
  });

  const draftError = templateDraftError(draft);

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    if (draftError) {
      toast.error(draftError);
      return;
    }
    sendTemplateToNewContact.mutate(data);
  };

  const configurationId = useWatch({ control: form.control, name: "configurationId" });

  useEffect(() => {
    form.reset({ phoneNumber: defaultPhone ?? "", name: defaultName ?? "", configurationId: "" });
  }, [isOpen]);

  const changeOpen = (value: boolean) => {
    setIsOpen(value);
    if (!value) setDraft(emptyTemplateDraft);
  };

  useEffect(() => {
    if (configurations.length === 1 && !form.getValues("configurationId")) form.setValue("configurationId", configurations[0].id);
  }, [isOpen, configurationsQuery.data]);

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <button
            type="button"
            title="Nova conversa"
            aria-label="Nova conversa"
            className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
          >
            <MessageSquarePlus className="h-4 w-4" />
          </button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>
            Envie um modelo aprovado pela Meta para iniciar uma conversa
            {defaultPhone ? " com este telefone" : " com um número ainda não cadastrado"}.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-new-contact-template">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" placeholder="(11) 99999-9999" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do contato (opcional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="configurationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enviar pelo número</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className={selectClassName}
                      disabled={field.disabled || configurationsQuery.isLoading}
                      onChange={(event) => {
                        // Os modelos dependem da conta do WhatsApp do número escolhido
                        setDraft(emptyTemplateDraft);
                        field.onChange(event);
                      }}
                    >
                      <option value="" disabled>
                        {configurationsQuery.isLoading ? "Carregando..." : "Selecione"}
                      </option>
                      {configurations.map((configuration) => (
                        <option key={configuration.id} value={configuration.id}>
                          {configuration.phoneNumber}
                        </option>
                      ))}
                      {whatsappWebConfigurations.map((configuration) => (
                        <option key={configuration.id} value={configuration.id} disabled>
                          {formatConfigurationPhoneNumber(configuration)} (QR code)
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  {whatsappWebConfigurations.length > 0 && <p className="text-muted-foreground text-xs">{WHATSAPP_WEB_TEMPLATE_HINT}.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />

            <TemplateComposer
              clientId={client.id}
              configurationId={configurationId}
              value={draft}
              onChange={setDraft}
              disabled={sendTemplateToNewContact.isPending}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form-new-contact-template" disabled={sendTemplateToNewContact.isPending || !draft.template}>
            {sendTemplateToNewContact.isPending ? "Enviando..." : "Enviar modelo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
