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
import { cn } from "@/lib/utils";
import { AI_AGENT_STYLES, styleFromTemperature, temperatureFromStyle, textareaClassName } from "../aiAgentConstants";
import { PromptAssistant } from "./promptAssistant";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AiAgentTestChat } from "./aiAgentTestChat";
import { AiAgentKnowledge } from "./aiAgentKnowledge";
import { AiAgentOffers } from "./aiAgentOffers";

type DialogSaveAiAgentProps = {
  clientId: string;
  // Aberto de fora (ex.: "+ Criar novo…" no editor de fluxo): sem botão próprio, avisa o agente criado
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (aiAgent: AiAgent) => void;
  aiAgent?: AiAgent;
};

const schema = z.object({
  name: z.string().trim().min(1, "O nome do agente é obrigatório").max(100, "Use no máximo 100 caracteres"),
  description: z.string().max(1000, "Use no máximo 1000 caracteres"),
  systemPrompt: z.string().trim().min(1, "Escreva as instruções do agente"),
  style: z.enum(["precise", "balanced", "creative"]),
});

type SchemaType = z.infer<typeof schema>;

type AgentTab = "instructions" | "knowledge" | "test";

export const DialogSaveAiAgent: FC<DialogSaveAiAgentProps> = ({ clientId, aiAgent, open, onOpenChange, onCreated }) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const [tab, setTab] = useState<AgentTab>("instructions");
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setIsOpen = (value: boolean) => {
    // Ao fechar, a próxima abertura começa nas instruções
    if (!value) setTab("instructions");
    if (isControlled) onOpenChange?.(value);
    else setInternalOpen(value);
  };
  const isEditing = !!aiAgent;

  const queryClient = useQueryClient();

  const onSuccess = (saved: AiAgent) => {
    queryClient.invalidateQueries({ queryKey: ["aiAgents", clientId] });
    if (!isEditing) onCreated?.(saved);
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
      style: "balanced",
    },
    disabled: isPending,
  });

  // Erro de validação aparece na aba das instruções, mesmo que o Salvar tenha sido clicado em outra
  const handleInvalid = () => setTab("instructions");

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    const { style, ...rest } = data;
    const body = { ...rest, description: data.description || undefined, temperature: temperatureFromStyle(style) };

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
      style: aiAgent ? styleFromTemperature(aiAgent.temperature) : "balanced",
    });
  }, [isOpen]);

  const systemPrompt = useWatch({ control: form.control, name: "systemPrompt" });
  const style = useWatch({ control: form.control, name: "style" });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {isEditing ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-8 w-8 shrink-0"
              aria-label={`Editar ${aiAgent?.name ?? "agente"}`}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <Button>Novo agente</Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar agente de IA" : "Novo agente de IA"}</DialogTitle>
          <DialogDescription>
            As instruções dizem ao agente quem ele é, o que pode responder e como conduzir o atendimento.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as AgentTab)}>
          <div className="-mx-1 overflow-x-auto px-1">
            <TabsList className="w-max">
              <TabsTrigger value="instructions">Instruções</TabsTrigger>
              <TabsTrigger value="knowledge">O que o agente sabe</TabsTrigger>
              <TabsTrigger value="test">Testar agente</TabsTrigger>
            </TabsList>
          </div>

          {/* Fica montada nas outras abas para o formulário e o botão Salvar continuarem valendo */}
          <TabsContent value="instructions" forceMount className="data-[state=inactive]:hidden">
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit, handleInvalid)} className="grid content-start gap-4" id="form-ai-agent">
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
                        <FormLabel>Instruções do agente</FormLabel>
                        <FormControl>
                          <textarea
                            {...field}
                            placeholder="Escreva as instruções ou peça ao assistente ao lado para escrever"
                            className={`${textareaClassName} min-h-80`}
                          />
                        </FormControl>
                        <FormDescription>
                          Ex.: quem é a empresa, o que o agente pode dizer, o que nunca deve fazer e quando chamar a equipe.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="style"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jeito de responder</FormLabel>
                        <div role="radiogroup" aria-label="Jeito de responder" className="grid gap-2 sm:grid-cols-3">
                          {AI_AGENT_STYLES.map((style) => (
                            <button
                              key={style.value}
                              type="button"
                              role="radio"
                              aria-checked={field.value === style.value}
                              disabled={field.disabled}
                              onClick={() => field.onChange(style.value)}
                              className={cn(
                                "rounded-lg border p-3 text-left text-sm transition-colors disabled:opacity-50",
                                field.value === style.value ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-muted/60",
                              )}
                            >
                              <span className="font-medium">{style.label}</span>
                              <span className="text-muted-foreground mt-0.5 block text-xs">{style.description}</span>
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
          </TabsContent>

          <TabsContent value="knowledge">
            {aiAgent ? (
              <>
                <AiAgentOffers clientId={clientId} aiAgentId={aiAgent.id} />
                <AiAgentKnowledge clientId={clientId} aiAgent={aiAgent} />
              </>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
                Salve o agente primeiro. Depois, abra-o de novo para ensinar perguntas e respostas, arquivos e páginas do seu site.
              </p>
            )}
          </TabsContent>

          <TabsContent value="test">
            {isOpen && (
              <AiAgentTestChat
                clientId={clientId}
                aiAgentId={aiAgent?.id}
                systemPrompt={systemPrompt}
                temperature={temperatureFromStyle(style)}
              />
            )}
            {isEditing && form.formState.isDirty && (
              <p className="text-muted-foreground mt-2 text-xs">
                O teste já usa as alterações da tela. Lembre de salvar para valerem no WhatsApp.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="submit" form="form-ai-agent" disabled={isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
