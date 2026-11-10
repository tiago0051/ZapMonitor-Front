import { EmptyState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Columns3 } from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { DialogSavePipeline } from "./components/dialogSavePipeline";

export const Pipelines = () => {
  const { clientId } = useParams();
  const queryClient = useQueryClient();

  const findAllPipelinesQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["crm", "pipelines", clientId],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: clientId! } }),
  });

  const setPipelineActive = useMutation({
    mutationFn: crmService.setPipelineActive,
    onError: requestErrorHandling,
    onSuccess: (pipeline) => {
      queryClient.invalidateQueries({ queryKey: ["crm", "pipelines", clientId] });
      toast.success(pipeline.active ? "Funil ativado" : "Funil desativado");
    },
  });

  const pipelines = findAllPipelinesQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Funis do CRM</CardTitle>
          <CardDescription>
            Cada funil tem as etapas por onde os negócios passam até serem ganhos ou perdidos. Quem vê cada negócio é definido pelo grupo de
            atendimento do próprio negócio, não pelo funil.
          </CardDescription>
        </div>
        <DialogSavePipeline clientId={clientId!} />
      </CardHeader>
      <CardContent>
        {pipelines.length === 0 && (
          <EmptyState title="Nenhum funil cadastrado" description="Crie um funil para os atendentes acompanharem os negócios no CRM." />
        )}

        {pipelines.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pipelines.map((pipeline) => (
              <div key={pipeline.id} className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Columns3 className="text-primary h-5 w-5 shrink-0" />
                    <h3 className="truncate text-base font-semibold">{pipeline.name}</h3>
                    <Badge variant={pipeline.active ? "default" : "secondary"}>{pipeline.active ? "Ativo" : "Inativo"}</Badge>
                  </div>
                  <DialogSavePipeline clientId={clientId!} pipeline={pipeline} />
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {pipeline.stages.map((stage) => (
                    <span key={stage.id} className="bg-muted inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }} />
                      {stage.name}
                    </span>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  disabled={setPipelineActive.isPending}
                  onClick={() =>
                    setPipelineActive.mutate({
                      params: { clientId: clientId!, pipelineId: pipeline.id },
                      body: { active: !pipeline.active },
                    })
                  }
                >
                  {pipeline.active ? "Desativar" : "Ativar"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
