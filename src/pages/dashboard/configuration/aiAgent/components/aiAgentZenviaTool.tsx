import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zenviaService } from "@/services/api/zenviaService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ticket } from "lucide-react";
import { useEffect, type FC } from "react";
import { useForm, useWatch, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const schema = z.object({
  enabled: z.boolean(),
  baseUrl: z.string().trim(),
  apiKey: z.string().trim(),
  eventId: z.string().trim(),
});

type FormValues = z.infer<typeof schema>;

type AiAgentZenviaToolProps = {
  clientId: string;
  aiAgent: AiAgent;
};

/** Venda de ingressos pelo Zenvia: o agente mostra os produtos, cria o pedido e manda o link de pagamento. */
export const AiAgentZenviaTool: FC<AiAgentZenviaToolProps> = ({ clientId, aiAgent }) => {
  const queryClient = useQueryClient();
  const queryKey = ["aiAgentTool", "zenvia", clientId, aiAgent.id];

  const toolQuery = useQuery({
    queryKey,
    queryFn: () => zenviaService.findAgentTool({ params: { clientId, aiAgentId: aiAgent.id } }),
  });
  const tool = toolQuery.data;

  const form = useForm<FormValues>({
    resolver: zodResolver(
      schema.superRefine((values, context) => {
        if (!values.enabled) return;
        if (!values.baseUrl) context.addIssue({ code: "custom", path: ["baseUrl"], message: "Informe o endereço do Zenvia" });
        if (!values.apiKey && !tool?.hasApiKey)
          context.addIssue({ code: "custom", path: ["apiKey"], message: "Informe a chave de integração gerada no Zenvia" });
      }),
    ),
    defaultValues: { enabled: false, baseUrl: "", apiKey: "", eventId: "" },
  });
  const enabled = useWatch({ control: form.control, name: "enabled" });

  useEffect(() => {
    if (tool) form.reset({ enabled: tool.enabled, baseUrl: tool.baseUrl, apiKey: "", eventId: tool.eventId ?? "" });
  }, [tool]);

  const save = useMutation({
    mutationFn: zenviaService.saveAgentTool,
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
      toast.success(saved.enabled ? "Venda de ingressos ligada no agente" : "Venda de ingressos desligada");
    },
  });

  const onSubmit: SubmitHandler<FormValues> = (values) =>
    save.mutate({
      params: { clientId, aiAgentId: aiAgent.id },
      body: { enabled: values.enabled, baseUrl: values.baseUrl, apiKey: values.apiKey || undefined, eventId: values.eventId || null },
    });

  if (toolQuery.isLoading) return <LoadingState />;
  if (toolQuery.isError) return <ErrorState message="Não foi possível carregar a venda de ingressos" onRetry={() => toolQuery.refetch()} />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded-lg border p-3">
        <div className="flex items-start gap-3">
          <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1 space-y-1">
            <FormField
              control={form.control}
              name="enabled"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(checked === true)} />
                  </FormControl>
                  <FormLabel className="font-medium">Venda de ingressos (Zenvia)</FormLabel>
                </FormItem>
              )}
            />
            <p className="text-muted-foreground text-sm">
              O agente mostra os ingressos e produtos do evento, pergunta se o contato paga com Pix ou cartão e manda o link de pagamento. O
              QR code chega sozinho pelo WhatsApp depois do pagamento.
            </p>
          </div>
        </div>

        <fieldset disabled={!enabled} className="grid grid-cols-1 gap-4 disabled:opacity-60 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="baseUrl"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Endereço do Zenvia</FormLabel>
                <FormControl>
                  <Input placeholder="https://api.zenvia.com.br" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="apiKey"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chave de integração</FormLabel>
                <FormControl>
                  <Input type="password" autoComplete="off" placeholder={tool?.hasApiKey ? "Chave salva" : ""} {...field} />
                </FormControl>
                <FormDescription>Gerada no Zenvia, em Integrações. Deixe em branco para manter a chave salva.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="eventId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código do evento (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Vazio: o agente oferece todos os eventos com venda aberta.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={save.isPending}>
            Salvar venda de ingressos
          </Button>
        </div>
      </form>
    </Form>
  );
};
