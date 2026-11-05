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
  kind: z.enum(["SERVICE", "QUEUE"]),
});

const KIND_OPTIONS: { value: FlowKind; label: string; description: string }[] = [
  { value: "SERVICE", label: "Atendimento", description: "Conduz o contato desde a primeira mensagem: perguntas, IA, grupos." },
  {
    value: "QUEUE",
    label: "Fila",
    description: "Age enquanto o contato espera um atendente: mensagens a cada período e resposta a quem escreve.",
  },
];

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
    defaultValues: { name: "", kind: "SERVICE" },
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
            O fluxo é criado inativo. Monte no editor, publique e ative. O fluxo de fila é escolhido no grupo de atendimento ou no nó Grupo
            de outro fluxo.
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
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <div className="grid gap-2" role="radiogroup">
                    {KIND_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-start gap-2 rounded-lg border p-3"
                      >
                        <input
                          type="radio"
                          name={field.name}
                          value={option.value}
                          checked={field.value === option.value}
                          onChange={() => field.onChange(option.value)}
                          className="mt-1"
                        />
                        <span>
                          <span className="block text-sm font-medium">{option.label}</span>
                          <span className="text-muted-foreground block text-xs">{option.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
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
