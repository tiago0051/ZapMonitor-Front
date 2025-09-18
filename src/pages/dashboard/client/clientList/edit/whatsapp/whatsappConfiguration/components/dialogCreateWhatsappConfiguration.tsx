import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import parsePhoneNumberFromString, {
  isPossiblePhoneNumber,
} from "libphonenumber-js";
import { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

type DialogCreateWhatsappConfigurationProps = {
  className?: string;
  clientId: string;
};

const schema = z.object({
  phoneNumber: z.string().refine((arg) => isPossiblePhoneNumber(arg), {
    message: "Telefone inválido",
  }),
  phoneNumberId: z.string().min(1, "O ID do telefone é obrigatório"),
  authorizationToken: z.string().min(1, "O token de autorização é obrigatório"),
  webhookSecret: z.string().min(1, "O segredo do webhook é obrigatório"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogCreateWhatsappConfiguration = ({
  className,
  clientId,
}: DialogCreateWhatsappConfigurationProps) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const createWhatsappConfigurationMutation = useMutation({
    mutationFn: whatsappService.createConfiguration,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsappConfigurations", clientId],
      });
      toast.success("Configuração criada com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      authorizationToken: "",
      phoneNumber: "",
      phoneNumberId: "",
      webhookSecret: "",
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
      body: data,
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
        <Button className={className}>Nova Configuração</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Configuração</DialogTitle>
          <DialogDescription>
            Crie uma nova configuração para de integração com o WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-4"
            id="form"
          >
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      onChange={(e) =>
                        onChange(onChangePhoneNumber(e.target.value))
                      }
                      placeholder="+55 11 11111 1111"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phoneNumberId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="ID do telefone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="authorizationToken"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Token de Autorização</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Token de autorização" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="webhookSecret"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Segredo do Webhook</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Segredo do webhook" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="submit"
            form="form"
            disabled={createWhatsappConfigurationMutation.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
