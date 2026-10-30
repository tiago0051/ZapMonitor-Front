import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { aiAgentService } from "@/services/api/aiAgentService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { textareaClassName } from "../aiAgentConstants";
import { PromptAssistant } from "./promptAssistant";

type DialogSaveAiAgentProps = {
  clientId: string;
  aiAgent?: AiAgent;
};

const schema = z.object({
  name: z.string().trim().min(1, "O nome do agente é obrigatório").max(100, "Use no máximo 100 caracteres"),
  description: z.string().max(1000, "Use no máximo 1000 caracteres"),
  systemPrompt: z.string().trim().min(1, "O system prompt é obrigatório"),
  model: z.string(),
  temperature: z.number().min(0, "Mínimo 0").max(2, "Máximo 2"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogSaveAiAgent: FC<DialogSaveAiAgentProps> = ({ clientId, aiAgent }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isEditing = !!aiAgent;

  const queryClient = useQueryClient();

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["aiAgents", clientId] });
    toast.success(isEditing ? "Agente atualizado com sucesso" : "Agente criado com sucesso");
    setIsOpen(false);
  };

  const createAiAgent = useMutation({
    mutationFn: aiAgentService.create,
    onError: requestErrorHandling,
    onSuccess,
  });

  const updateAiAgent = useMutation({
    mutationFn: aiAgentService.update,
    onError: requestErrorHandling,
    onSuccess,
  });

  const isPending = createAiAgent.isPending || updateAiAgent.isPending;

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "",
      model: "",
      temperature: 0.7,
    },
    disabled: isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    const body = { ...data, description: data.description || undefined, model: data.model || undefined };

    if (aiAgent) {
      updateAiAgent.mutate({ params: { clientId, aiAgentId: aiAgent.id }, body });
      return;
    }

    createAiAgent.mutate({ params: { clientId }, body });
  };

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: aiAgent?.name ?? "",
      description: aiAgent?.description ?? "",
      systemPrompt: aiAgent?.systemPrompt ?? "",
      model: aiAgent?.model ?? "",
      temperature: aiAgent?.temperature ?? 0.7,
    });
  }, [isOpen]);

  const systemPrompt = useWatch({ control: form.control, name: "systemPrompt" });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 shrink-0">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Novo agente</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar agente de IA" : "Novo agente de IA"}</DialogTitle>
          <DialogDescription>Cada agente tem o próprio system prompt, que define como ele conduz o atendimento.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="grid content-start gap-4" id="form-ai-agent">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex.: Agente de vendas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Para que serve este agente (uso interno)" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="systemPrompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>System prompt</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        placeholder="Escreva o prompt ou gere um com o assistente ao lado"
                        className={`${textareaClassName} min-h-80 font-mono`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Padrão da configuração de IA" />
                      </FormControl>
                      <FormDescription>Deixe vazio para usar o modelo configurado no cliente.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="temperature"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Temperatura</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step={0.1}
                          min={0}
                          max={2}
                          onChange={(e) => field.onChange(e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormDescription>Menor = respostas mais previsíveis.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>

          {isOpen && (
            <PromptAssistant
              clientId={clientId}
              defaultObjective={aiAgent?.description ?? ""}
              currentPrompt={systemPrompt}
              disabled={isPending}
              onGenerated={(prompt) => form.setValue("systemPrompt", prompt, { shouldDirty: true, shouldValidate: true })}
            />
          )}
        </div>

        <DialogFooter>
          <Button type="submit" form="form-ai-agent" disabled={isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
