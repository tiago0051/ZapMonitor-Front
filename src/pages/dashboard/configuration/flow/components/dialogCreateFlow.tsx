import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { File, Landmark, Loader2, Stethoscope, Store, UtensilsCrossed, Wrench, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { useNavigate } from "react-router";
import z from "zod";

type DialogCreateFlowProps = {
  clientId: string;
};

const schema = z.object({
  name: z.string().trim().min(1, "O nome do fluxo é obrigatório").max(100, "Use no máximo 100 caracteres"),
  kind: z.enum(["SERVICE", "QUEUE"]),
  templateId: z.string(),
});

// Ícone de cada modelo (o servidor manda o nome)
const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  stethoscope: Stethoscope,
  store: Store,
  wrench: Wrench,
  landmark: Landmark,
  utensils: UtensilsCrossed,
  file: File,
};

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

  const templatesQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["flows", clientId, "templates"],
    queryFn: () => flowService.findTemplates(clientId),
    enabled: isOpen,
    staleTime: Infinity,
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", kind: "SERVICE", templateId: "blank" },
    disabled: createFlow.isPending,
  });
  const kind = useWatch({ control: form.control, name: "kind" });

  const handleSubmit: SubmitHandler<SchemaType> = ({ templateId, ...data }) => {
    // Modelo só vale para o fluxo de atendimento; "Em branco" é o canvas vazio de sempre
    const useTemplate = data.kind === "SERVICE" && templateId !== "blank";
    createFlow.mutate({ params: { clientId }, body: { ...data, ...(useTemplate ? { templateId } : {}) } });
  };

  useEffect(() => {
    if (!isOpen) form.reset();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Novo fluxo</Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto">
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
            {kind === "SERVICE" && (
              <FormField
                control={form.control}
                name="templateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Começar com um modelo</FormLabel>
                    <p className="text-muted-foreground -mt-1 text-xs">
                      O modelo já traz boas-vindas, horário, pergunta, agente de IA e grupo. Depois é só escolher o agente e o grupo no
                      editor.
                    </p>
                    {templatesQuery.isLoading ? (
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup">
                        {(templatesQuery.data ?? []).map((template) => {
                          const Icon = TEMPLATE_ICONS[template.icon] ?? File;
                          return (
                            <label
                              key={template.id}
                              className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-start gap-2 rounded-lg border p-3"
                            >
                              <input
                                type="radio"
                                name={field.name}
                                value={template.id}
                                checked={field.value === template.id}
                                onChange={() => field.onChange(template.id)}
                                className="sr-only"
                              />
                              <Icon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                <span className="block text-sm font-medium">{template.name}</span>
                                <span className="text-muted-foreground block text-xs">{template.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </FormItem>
                )}
              />
            )}
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
