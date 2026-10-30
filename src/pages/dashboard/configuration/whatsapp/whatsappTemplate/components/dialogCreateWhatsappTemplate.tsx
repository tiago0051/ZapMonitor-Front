import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { whatsappContants } from "@/contants/whatsappContants";
import { templateService } from "@/services/api/templateService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

type DialogCreateWhatsappTemplateProps = {
  className?: string;
  clientId: string;
};

const schema = z.object({
  name: z.string().min(1, "O nome do template é obrigatório"),
  language: z.string().min(1, "Selecione o idioma do template"),
  description: z.string().optional(),
});

type SchemaType = z.infer<typeof schema>;

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const DialogCreateWhatsappTemplate: FC<DialogCreateWhatsappTemplateProps> = ({ clientId }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const queryClient = useQueryClient();

  const createWhatsappTemplate = useMutation({
    mutationFn: templateService.create,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsappTemplates", clientId],
      });
      toast.success("Template cadastrado com sucesso!");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      language: whatsappContants.DEFAULT_TEMPLATE_LANGUAGE,
      description: "",
    },
    disabled: createWhatsappTemplate.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    createWhatsappTemplate.mutate({
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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo template
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo template</DialogTitle>
          <DialogDescription>Cadastre um nome de template do WhatsApp para este cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form">
            <FormField
              control={form.control}
              name="name"
              render={({ field: { ...field } }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do template" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Idioma</FormLabel>
                  <FormControl>
                    <select {...field} className={selectClassName}>
                      {whatsappContants.TEMPLATE_LANGUAGES.map((language) => (
                        <option key={language.code} value={language.code}>
                          {language.label} ({language.code})
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
              name="description"
              render={({ field: { ...field } }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Descrição (opcional)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form" disabled={createWhatsappTemplate.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
