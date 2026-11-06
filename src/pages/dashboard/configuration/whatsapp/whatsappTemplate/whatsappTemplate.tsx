import { EmptyState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TemplatePreview } from "@/components/whatsappTemplate/templatePreview";
import { templateCategoryLabel, templateStatusInfo } from "@/components/whatsappTemplate/templateUtils";
import { cn } from "@/lib/utils";
import { templateService } from "@/services/api/templateService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { DialogCreateWhatsappTemplate } from "./components/dialogCreateWhatsappTemplate";
import { DialogDeleteWhatsappTemplate } from "./components/dialogDeleteWhatsappTemplate";

const syncMessage = (result: WhatsappTemplateSyncResult) => {
  const total = result.created + result.updated;
  const parts = [`${total} ${total === 1 ? "modelo sincronizado" : "modelos sincronizados"}`];
  if (result.created) parts.push(`${result.created} ${result.created === 1 ? "novo" : "novos"}`);
  if (result.removed) parts.push(`${result.removed} ${result.removed === 1 ? "removido" : "removidos"} da Meta`);
  return parts.join(" · ");
};

export const WhatsappTemplate = () => {
  const { clientId } = useParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const findAllWhatsappTemplatesQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappTemplates", clientId],
    queryFn: () => templateService.findAll({ params: { clientId: clientId! } }),
  });

  const syncMutation = useMutation({
    mutationFn: () => templateService.sync({ params: { clientId: clientId! } }),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplates", clientId] });

      if (result.wabas === 0) {
        toast.warning("Nenhum número com conta do WhatsApp conhecida", {
          description: "A conta é identificada na primeira mensagem recebida pelo número. Tente de novo depois disso.",
        });
        return;
      }

      toast.success(syncMessage(result));
      for (const failure of result.failures)
        toast.error(`Não foi possível ler os modelos da conta ${failure.wabaId}`, { description: failure.message });
      if (result.configurationsWithoutWaba.length)
        toast.info(`Sem conta do WhatsApp identificada: ${result.configurationsWithoutWaba.join(", ")}`, {
          description: "Esses números entram na próxima sincronização depois de receberem uma mensagem.",
        });
    },
  });

  const templates = findAllWhatsappTemplatesQuery.data;
  const term = search.trim().toLowerCase();
  const filtered = term
    ? templates.filter((template) => template.name.toLowerCase().includes(term) || template.bodyText?.toLowerCase().includes(term))
    : templates;
  const lastSync = templates
    .map((template) => template.syncedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            Modelos aprovados pela Meta para iniciar conversas ou retomar quando a janela de 24 horas fechou. Crie e edite os modelos no
            Gerenciador do WhatsApp e sincronize aqui.
          </CardDescription>
          {lastSync && (
            <p className="text-muted-foreground mt-1 text-xs">
              Última sincronização em {format(new Date(lastSync), "dd/MM/yyyy 'às' HH:mm")}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <DialogCreateWhatsappTemplate clientId={clientId!} />
          <Button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncMutation.isPending && "animate-spin")} />
            {syncMutation.isPending ? "Sincronizando..." : "Sincronizar com a Meta"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {templates.length === 0 && (
          <EmptyState
            title="Nenhum modelo ainda"
            description="Sincronize com a Meta para trazer os modelos da conta do WhatsApp dos seus números."
          />
        )}

        {templates.length > 0 && (
          <Input
            id="template-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome ou texto"
            className="sm:max-w-xs"
          />
        )}

        {templates.length > 0 && filtered.length === 0 && <p className="text-muted-foreground text-sm">Nenhum modelo com esse termo.</p>}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((template) => {
              const status = templateStatusInfo(template);
              return (
                <div key={template.id} className="bg-card text-card-foreground flex min-w-0 flex-col gap-3 rounded-xl border p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold" title={template.name}>
                        {template.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
                        <span className={cn("rounded px-1.5 py-0.5", status.className)}>{status.label}</span>
                        {template.category && (
                          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                            {templateCategoryLabel[template.category] ?? template.category}
                          </span>
                        )}
                        <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5">{template.language}</span>
                        {template.parameters.length > 0 && (
                          <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5">
                            {template.parameters.length} {template.parameters.length === 1 ? "variável" : "variáveis"}
                          </span>
                        )}
                      </div>
                    </div>
                    {!template.synced && <DialogDeleteWhatsappTemplate clientId={clientId!} templateId={template.id} />}
                  </div>

                  {template.description && <p className="text-muted-foreground text-sm">{template.description}</p>}

                  <TemplatePreview template={template} />

                  {template.rejectedReason && <p className="text-destructive text-xs">Motivo da Meta: {template.rejectedReason}</p>}
                  {template.sendable === false && !template.rejectedReason && template.unavailableReason && (
                    <p className="text-muted-foreground text-xs">{template.unavailableReason}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
