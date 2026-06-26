import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { aiService } from "@/services/api/aiService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { Skeleton } from "@/components/ui/skeleton";

export const WhatsappAiConfiguration = () => {
  const { clientId } = useParams();

  const getClientAiConfigQuery = useSuspenseQuery({
    queryKey: ["aiConfig", clientId],
    queryFn: () =>
      aiService.getClientAiConfig({
        params: {
          clientId: clientId!,
        },
      }),
  });

  const aiConfig = getClientAiConfigQuery.data;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração de IA</CardTitle>
        <CardDescription>Visualize e gerencie as configurações de inteligência artificial para este cliente.</CardDescription>
      </CardHeader>
      <CardContent>
        {getClientAiConfigQuery.isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </div>
        )}
        {getClientAiConfigQuery.isError && <p className="text-red-500">Erro ao carregar configurações de IA</p>}
        {aiConfig && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-semibold">Status</Label>
                <div>
                  <Badge variant={aiConfig.enabled ? "default" : "secondary"}>{aiConfig.enabled ? "Ativado" : "Desativado"}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-semibold">Modelo</Label>
                <p className="text-sm font-medium">{aiConfig.model}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-semibold">Temperatura</Label>
                <p className="text-sm font-medium">{aiConfig.temperature}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm font-semibold">ID da Configuração</Label>
                <p className="font-mono text-sm break-all">{aiConfig.id}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground text-sm font-semibold">Prompt do Sistema</Label>
              <div className="bg-muted rounded-md border p-4">
                <p className="text-sm whitespace-pre-wrap">{aiConfig.systemPrompt}</p>
              </div>
            </div>

            <div className="text-muted-foreground grid grid-cols-1 gap-4 border-t pt-4 text-xs md:grid-cols-2">
              <div>
                <p className="font-semibold">Criado em</p>
                <p>{formatDate(aiConfig.createdAt)}</p>
              </div>
              <div>
                <p className="font-semibold">Última atualização</p>
                <p>{formatDate(aiConfig.updatedAt)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
