import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aiService } from "@/services/api/aiService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { toast } from "sonner";
import { DialogCreateAiConfig } from "./components/dialogCreateAiConfig";
import { DialogEditAiConfig } from "./components/dialogEditAiConfig";

export const WhatsappAiConfiguration = () => {
  const { clientId } = useParams();
  const queryClient = useQueryClient();

  const getClientAiConfigQuery = useSuspenseQuery({
    queryKey: ["aiConfig", clientId],
    queryFn: () =>
      aiService.getClientAiConfig({
        params: {
          clientId: clientId!,
        },
      }),
  });

  // Sem configuração a API responde vazio, não erro
  const aiConfig = getClientAiConfigQuery.data || null;

  const toggleAiConfig = useMutation({
    mutationFn: aiService.toggleClientAiConfig,
    onError: requestErrorHandling,
    onSuccess: (updatedAiConfig) => {
      queryClient.setQueryData(["aiConfig", clientId], updatedAiConfig);
      toast.success(updatedAiConfig.enabled ? "IA ativada" : "IA desativada");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Inteligência artificial</CardTitle>
          <CardDescription>
            Chave de API usada pelos agentes, pela condicional com IA, pela transcrição de áudios e pelos resumos de atendimento.
          </CardDescription>
        </div>
        {aiConfig && (
          <div className="flex shrink-0 gap-2">
            <DialogEditAiConfig clientId={clientId!} aiConfig={aiConfig} />
            <Button
              variant={aiConfig.enabled ? "outline" : "default"}
              size="sm"
              disabled={toggleAiConfig.isPending}
              onClick={() => toggleAiConfig.mutate({ params: { clientId: clientId! }, enabled: !aiConfig.enabled })}
            >
              {aiConfig.enabled ? "Desativar IA" : "Ativar IA"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!aiConfig && (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              A IA ainda não foi configurada. Sem ela, os nós de agente de IA dos fluxos encaminham o contato direto para a fila.
            </p>
            <DialogCreateAiConfig clientId={clientId!} />
          </div>
        )}

        {aiConfig && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-semibold">Status</Label>
              <div className="flex items-center gap-2">
                <Badge variant={aiConfig.enabled ? "default" : "secondary"}>{aiConfig.enabled ? "Ativada" : "Desativada"}</Badge>
                {!aiConfig.enabled && (
                  <span className="text-muted-foreground text-xs">
                    Agentes de IA, transcrições e resumos ficam pausados. A IA também é desativada automaticamente após falhas seguidas da
                    chave.
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-semibold">Prompt para atendimentos fora de fluxo</Label>
              <p className="text-muted-foreground text-xs">
                Usado só quando não há fluxo ativo. Dentro de um fluxo, cada agente de IA usa o próprio prompt.
              </p>
              <div className="bg-muted rounded-md border p-4">
                <p className="line-clamp-6 text-sm whitespace-pre-wrap">{aiConfig.systemPrompt}</p>
              </div>
            </div>

            <p className="text-muted-foreground border-t pt-4 text-xs">
              Última atualização em {new Date(aiConfig.updatedAt).toLocaleString("pt-BR")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
