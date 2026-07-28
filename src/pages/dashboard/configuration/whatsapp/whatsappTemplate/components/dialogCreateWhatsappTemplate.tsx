import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  description: z.string().optional(),
});

type SchemaType = z.infer<typeof schema>;

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
      toast.success("Nome de template criado com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
    },
    disabled: createWhatsappTemplate.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    const description = data.description?.trim();

    createWhatsappTemplate.mutate({
      body: {
        name: data.name.trim(),
        ...(description ? { description } : {}),
      },
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
