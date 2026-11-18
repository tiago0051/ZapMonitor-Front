import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import parsePhoneNumberFromString, { isPossiblePhoneNumber } from "libphonenumber-js";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

type DialogCreateWhatsappConfigurationProps = {
  className?: string;
  clientId: string;
  disabled?: boolean;
};

const schema = z.object({
  phoneNumber: z.string().refine((arg) => isPossiblePhoneNumber(arg), {
    message: "Telefone inválido",
  }),
  phoneNumberId: z.string().min(1, "Informe a identificação do número"),
  authorizationToken: z.string().min(1, "Informe a chave de acesso"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogCreateWhatsappConfiguration = ({ className, clientId, disabled }: DialogCreateWhatsappConfigurationProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const createWhatsappConfigurationMutation = useMutation({
    mutationFn: whatsappService.createConfiguration,
    onError: requestErrorHandling,
    onSuccess: () => {
      // Também atualiza o uso do plano, que fica sob a mesma chave
      queryClient.invalidateQueries({
        queryKey: ["whatsappConfigurations", clientId],
      });
      toast.success("Número cadastrado com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      authorizationToken: "",
      phoneNumber: "",
      phoneNumberId: "",
    },
    disabled: createWhatsappConfigurationMutation.isPending,
  });

  function onChangePhoneNumber(value: string) {
    const phoneNumber = parsePhoneNumberFromString(value);
    if (!phoneNumber?.isValid()) return value;
    return phoneNumber.formatInternational();
  }

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    createWhatsappConfigurationMutation.mutate({
      // As mensagens recebidas são conferidas pela assinatura do aplicativo; o segredo do número é só um identificador gerado aqui
      body: { ...data, webhookSecret: crypto.randomUUID().replaceAll("-", "") },
      params: { clientId },
    });
  };

  useEffect(() => {
    if (!isOpen) {
      form.reset();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className={cn("text-muted-foreground h-auto px-0", className)} disabled={disabled}>
          Avançado: cadastrar com os dados da Meta
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro manual (avançado)</DialogTitle>
          <DialogDescription>
            Prefira "Conectar com a Meta", que preenche tudo sozinho. Use este cadastro só se a conexão automática não funcionar: os dados
            ficam no painel de desenvolvedor da Meta (developers.facebook.com), no aplicativo do WhatsApp, em "Configuração da API". Depois
            de salvar, abra "Gerenciar número" (engrenagem na lista) para conferir se as mensagens estão chegando.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form">
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} onChange={(e) => onChange(onChangePhoneNumber(e.target.value))} placeholder="+55 11 11111 1111" />
                  </FormControl>
                  <FormDescription>O número do WhatsApp com o código do país (+55) e o DDD.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Identificação do número na Meta</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: 106540352242922" inputMode="numeric" />
                  </FormControl>
                  <FormDescription>
                    Só números. Na Meta aparece como "Identificação do número de telefone" (Phone number ID), logo abaixo do número.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorizationToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chave de acesso permanente</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Começa com EAA..." autoComplete="off" />
                  </FormControl>
                  <FormDescription>
                    Gerada para um usuário do sistema no Gerenciador de Negócios da Meta, com as permissões do WhatsApp. Não use a chave
                    temporária da tela de testes: ela expira em 24 horas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form" disabled={createWhatsappConfigurationMutation.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
