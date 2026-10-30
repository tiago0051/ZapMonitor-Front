import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router";
import z from "zod";

type DialogCreateFlowProps = {
  clientId: string;
};

const schema = z.object({
  name: z.string().trim().min(1, "O nome do fluxo é obrigatório").max(100, "Use no máximo 100 caracteres"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogCreateFlow: FC<DialogCreateFlowProps> = ({ clientId }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const createFlow = useMutation({
    mutationFn: flowService.create,
    onError: requestErrorHandling,
    onSuccess: (flow) => {
      queryClient.invalidateQueries({ queryKey: ["flows", clientId] });
      navigate(`flow/${flow.id}`);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
    disabled: createFlow.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    createFlow.mutate({ params: { clientId }, body: data });
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Novo fluxo</Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo fluxo de atendimento</DialogTitle>
          <DialogDescription>
            O fluxo é criado inativo. Depois de montá-lo no editor, ative-o para que novos atendimentos passem por ele.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-flow">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Atendimento padrão" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form-flow" disabled={createFlow.isPending}>
            Criar e abrir editor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
