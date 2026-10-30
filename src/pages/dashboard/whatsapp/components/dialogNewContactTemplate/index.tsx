import { useEffect, useState, type FC } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { templateService } from "@/services/api/templateService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isValidPhoneNumber } from "libphonenumber-js";
import { MessageSquarePlus } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

type DialogNewContactTemplateProps = {
  onSent: (contact: WhatsappContactMessage) => void;
};

const schema = z.object({
  phoneNumber: z
    .string()
    .min(1, "O telefone é obrigatório")
    .refine((value) => isValidPhoneNumber(value, "BR"), "Número de telefone inválido"),
  name: z.string().optional(),
  configurationId: z.string().min(1, "Selecione o número de envio"),
  templateId: z.string().min(1, "Selecione um template"),
});

type SchemaType = z.infer<typeof schema>;

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const DialogNewContactTemplate: FC<DialogNewContactTemplateProps> = ({ onSent }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", client.id],
    queryFn: () => templateService.findAll({ params: { clientId: client.id } }),
    enabled: isOpen,
  });

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
    enabled: isOpen,
  });

  const templates = templatesQuery.data || [];
  const configurations = (configurationsQuery.data?.items || []).filter((configuration) => configuration.enabled);

  const sendTemplateToNewContact = useMutation({
    mutationFn: whatsappService.sendTemplateToNewContact,
    onError: requestErrorHandling,
    onSuccess: (contact) => {
      toast.success("Template enviado com sucesso!");

      queryClient.invalidateQueries({ queryKey: ["whatsapp", "contacts"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp", "contactsStats"] });

      setIsOpen(false);
      onSent(contact);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      phoneNumber: "",
      name: "",
      configurationId: "",
      templateId: "",
    },
    disabled: sendTemplateToNewContact.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    sendTemplateToNewContact.mutate({
      params: { clientId: client.id },
      body: data,
    });
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen]);

  useEffect(() => {
    if (configurations.length === 1 && !form.getValues("configurationId")) form.setValue("configurationId", configurations[0].id);
  }, [isOpen, configurationsQuery.data]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          title="Nova conversa"
          className="hover:bg-muted text-muted-foreground hover:text-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova conversa</DialogTitle>
          <DialogDescription>Envie um template para iniciar uma conversa com um número ainda não cadastrado.</DialogDescription>
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
                    <select {...field} className={selectClassName} disabled={field.disabled || configurationsQuery.isLoading}>
                      <option value="" disabled>
                        {configurationsQuery.isLoading ? "Carregando..." : "Selecione"}
                      </option>
                      {configurations.map((configuration) => (
                        <option key={configuration.id} value={configuration.id}>
                          {configuration.phoneNumber}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="templateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template</FormLabel>
                  <FormControl>
                    <select {...field} className={selectClassName} disabled={field.disabled || templatesQuery.isLoading}>
                      <option value="" disabled>
                        {templatesQuery.isLoading ? "Carregando..." : templates.length === 0 ? "Nenhum template encontrado" : "Selecione"}
                      </option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.description ? `${template.name} — ${template.description}` : template.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form-new-contact-template" disabled={sendTemplateToNewContact.isPending}>
            Enviar template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
