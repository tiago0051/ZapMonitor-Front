import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertDialogCopySecret } from "@/pages/dashboard/configuration/client/components/alertDialogCopySecret";
import { clientService } from "@/services/api/clientService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome do tenant"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogCreateClient = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [secret, setSecret] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const createClient = useMutation({
    mutationFn: clientService.create,
    onError: requestErrorHandling,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["implanterClients"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Tenant criado com sucesso");
      form.reset();
      setIsOpen(false);
      // O segredo da API só é mostrado agora
      setSecret(data.secret);
    },
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    createClient.mutate({ body: data });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus />
            Novo tenant
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo tenant</DialogTitle>
            <DialogDescription>Você será o implantador do novo tenant e poderá convidar a equipe depois.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-create-client">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={createClient.isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter>
            <Button type="submit" form="form-create-client" disabled={createClient.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialogCopySecret secret={secret} onClose={() => setSecret(null)} />
    </>
  );
};
