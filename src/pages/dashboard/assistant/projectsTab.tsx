import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { assistantService } from "@/services/api/assistantService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCircle2, Circle, MessageSquare, Target, X } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { assistantKeys, formatNumber, metricLabel, projectStatusInfo } from "./assistantUtils";
import { StatusChip } from "./components/assistantDialogs";

type ProjectsTabProps = { onOpenConversation: (conversationId: string) => void };

/** Objetivos de negócio que o assistente acompanha; são criados pedindo na conversa. */
export const ProjectsTab: FC<ProjectsTabProps> = ({ onOpenConversation }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();

  const projectsQuery = useQuery({
    queryKey: assistantKeys.projects(client.id),
    queryFn: () => assistantService.findProjects(client.id),
  });
  const setStatus = useMutation({
    mutationFn: (variables: { id: string; status: AssistantProjectStatus }) =>
      assistantService.setProjectStatus(client.id, variables.id, variables.status),
    onSuccess: (_, variables) => {
      toast.success(variables.status === "DONE" ? "Projeto concluído" : "Projeto cancelado");
      queryClient.invalidateQueries({ queryKey: assistantKeys.projects(client.id) });
    },
    onError: requestErrorHandling,
  });

  const changeStatus = async (project: AssistantProject, status: "DONE" | "CANCELLED") => {
    const ok = await confirm({
      title: status === "DONE" ? "Concluir o projeto?" : "Cancelar o projeto?",
      description: "O assistente para de revisar este projeto.",
      confirmLabel: status === "DONE" ? "Concluir" : "Cancelar projeto",
      cancelLabel: "Voltar",
      destructive: status === "CANCELLED",
    });
    if (ok) setStatus.mutate({ id: project.id, status });
  };

  if (projectsQuery.isLoading) return <LoadingState label="Carregando projetos..." />;
  if (projectsQuery.isError)
    return (
      <ErrorState
        message="Não foi possível buscar os projetos."
        onRetry={() => projectsQuery.refetch()}
        isRetrying={projectsQuery.isFetching}
      />
    );

  const projects = projectsQuery.data ?? [];
  if (projects.length === 0)
    return (
      <EmptyState
        icon={Target}
        title="Nenhum projeto ainda"
        description='Projetos nascem pedindo ao assistente, por exemplo: "quero aumentar as vendas do CRM em 20% até o fim do mês". Ele define a meta, as etapas e revisa o andamento toda semana.'
      />
    );

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {projects.map((project) => {
        const status = projectStatusInfo[project.status];
        const done = project.milestones.filter((milestone) => milestone.done).length;
        return (
          <article key={project.id} className="grid content-start gap-3 rounded-xl border p-4">
            <header className="grid gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 font-semibold break-words">{project.title}</h3>
                <StatusChip label={status.label} className={status.className} />
              </div>
              <p className="text-muted-foreground text-sm">{project.goal}</p>
            </header>

            {project.metric && (
              <dl className="bg-muted/40 grid grid-cols-3 gap-2 rounded-md p-2 text-xs tabular-nums">
                <div className="col-span-3">
                  <dt className="sr-only">Indicador</dt>
                  <dd className="font-medium">{metricLabel[project.metric] ?? project.metric}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ponto de partida</dt>
                  <dd className="font-medium">{formatNumber(project.baseline)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Meta</dt>
                  <dd className="font-medium">{formatNumber(project.target)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Prazo</dt>
                  <dd className="font-medium">{project.deadline ? format(new Date(project.deadline), "dd/MM/yyyy") : "—"}</dd>
                </div>
              </dl>
            )}

            {project.milestones.length > 0 && (
              <div className="grid gap-1">
                <p className="text-muted-foreground text-xs">
                  Etapas: {done} de {project.milestones.length}
                </p>
                <ul className="grid gap-1">
                  {project.milestones.map((milestone, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      {milestone.done ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Feita" />
                      ) : (
                        <Circle className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-label="Pendente" />
                      )}
                      <span className={cn(milestone.done && "text-muted-foreground line-through")}>{milestone.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {project.reviewSummary && (
              <div className="rounded-md border px-3 py-2">
                <p className="text-xs font-semibold">
                  Última revisão{project.lastReviewAt && ` · ${format(new Date(project.lastReviewAt), "dd/MM HH:mm")}`}
                </p>
                <p className="text-sm whitespace-pre-wrap">{project.reviewSummary}</p>
              </div>
            )}
            {project.status === "ACTIVE" && project.nextReviewAt && (
              <p className="text-muted-foreground text-xs">Próxima revisão em {format(new Date(project.nextReviewAt), "dd/MM HH:mm")}</p>
            )}

            <footer className="flex flex-wrap gap-2">
              {project.conversationId && (
                <Button size="sm" variant="outline" onClick={() => onOpenConversation(project.conversationId!)}>
                  <MessageSquare className="h-4 w-4" />
                  Abrir conversa
                </Button>
              )}
              {project.status === "ACTIVE" && (
                <>
                  <Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => changeStatus(project, "DONE")}>
                    <CheckCircle2 className="h-4 w-4" />
                    Concluir
                  </Button>
                  <Button size="sm" variant="ghost" disabled={setStatus.isPending} onClick={() => changeStatus(project, "CANCELLED")}>
                    <X className="h-4 w-4" />
                    Cancelar
                  </Button>
                </>
              )}
            </footer>
          </article>
        );
      })}
      {confirmDialog}
    </div>
  );
};
