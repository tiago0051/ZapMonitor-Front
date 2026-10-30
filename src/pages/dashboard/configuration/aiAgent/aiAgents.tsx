import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { aiAgentService } from "@/services/api/aiAgentService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Bot } from "lucide-react";
import { useParams } from "react-router";
import { DialogDeleteAiAgent } from "./components/dialogDeleteAiAgent";
import { DialogSaveAiAgent } from "./components/dialogSaveAiAgent";

export const AiAgents = () => {
  const { clientId } = useParams();

  const findAllAiAgentsQuery = useSuspenseQuery({
    queryKey: ["aiAgents", clientId],
    queryFn: () => aiAgentService.findAll({ params: { clientId: clientId! } }),
  });

  const aiAgents = findAllAiAgentsQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Agentes de IA</CardTitle>
          <CardDescription>
            Crie agentes de atendimento com system prompts próprios. Eles usam a chave de API da configuração de IA do cliente.
          </CardDescription>
        </div>
        <DialogSaveAiAgent clientId={clientId!} />
      </CardHeader>
      <CardContent>
        {aiAgents.length === 0 && <p className="text-muted-foreground text-sm">Nenhum agente de IA cadastrado.</p>}

        {aiAgents.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {aiAgents.map((aiAgent) => (
              <div key={aiAgent.id} className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Bot className="h-5 w-5 shrink-0 text-violet-500" />
                    <h3 className="truncate text-base font-semibold">{aiAgent.name}</h3>
                  </div>
                  <div className="flex shrink-0">
                    <DialogSaveAiAgent clientId={clientId!} aiAgent={aiAgent} />
                    <DialogDeleteAiAgent clientId={clientId!} aiAgent={aiAgent} />
                  </div>
                </div>

                {aiAgent.description && <p className="text-muted-foreground text-sm">{aiAgent.description}</p>}

                <p className="bg-muted line-clamp-4 rounded-md p-2 font-mono text-xs whitespace-pre-wrap">{aiAgent.systemPrompt}</p>

                <div className="text-muted-foreground mt-auto flex items-center justify-between border-t pt-2 text-xs">
                  <span>
                    {aiAgent.model ?? "Modelo padrão"} · temperatura {aiAgent.temperature}
                  </span>
                  <span>{format(new Date(aiAgent.updatedAt), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
