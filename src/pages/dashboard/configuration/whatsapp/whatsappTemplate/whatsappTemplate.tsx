import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { templateService } from "@/services/api/templateService";
import { formatShortId } from "@/utils/formatString";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { useParams } from "react-router";
import { DialogCreateWhatsappTemplate } from "./components/dialogCreateWhatsappTemplate";
import { DialogDeleteWhatsappTemplate } from "./components/dialogDeleteWhatsappTemplate";

export const WhatsappTemplate = () => {
  const { clientId } = useParams();

  const findAllWhatsappTemplatesQuery = useSuspenseQuery({
    queryKey: ["whatsappTemplates", clientId],
    queryFn: () => templateService.findAll({ params: { clientId: clientId! } }),
  });

  const templates = findAllWhatsappTemplatesQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Gerencie os templates do WhatsApp para este cliente.</CardDescription>
        </div>
        <DialogCreateWhatsappTemplate clientId={clientId!}/>
      </CardHeader>
      <CardContent>
        {findAllWhatsappTemplatesQuery.isLoading && <p>Carregando...</p>}
        {findAllWhatsappTemplatesQuery.isError && <p>Erro ao buscar templates.</p>}

        {templates && templates.length === 0 && <p className="text-muted-foreground text-sm">Nenhum template encontrado.</p>}

        {templates && templates.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <div key={template.id} className="bg-card text-card-foreground flex flex-col justify-between rounded-xl border p-4 shadow-xs">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="text-primary h-5 w-5 shrink-0" />
                      <h3 className="truncate text-base font-semibold">{template.name}</h3>
                    </div>
                    <DialogDeleteWhatsappTemplate clientId={clientId!} templateId={template.id} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">{template.description}</p>
                </div>

                <div className="text-muted-foreground mt-4 flex items-center justify-between border-t pt-2 text-xs">
                  <span>ID: {formatShortId(template.id)}</span>
                  <span>{format(new Date(template.createdAt), "dd/MM/yyyy HH:mm")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
