import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TriangleAlert } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { getToolMeta } from "../aiIntegrationUtils";
import { useAiIntegrationMutations } from "../useAiIntegrationMutations";
import { AlertDialogRemoveAiIntegration } from "./alertDialogRemoveAiIntegration";
import { ConnectionTestResult } from "./connectionTestResult";
import { DialogGoogleCalendarIntegration, type AiIntegrationFormDialogProps } from "./dialogGoogleCalendarIntegration";

const INTEGRATION_FORMS: Partial<Record<AiIntegrationProviderKey, FC<AiIntegrationFormDialogProps>>> = {
  GOOGLE_CALENDAR: DialogGoogleCalendarIntegration,
};

type AiIntegrationCardProps = {
  clientId: string;
  provider: AiIntegrationProvider;
  integration?: AiIntegration;
};

export const AiIntegrationCard: FC<AiIntegrationCardProps> = ({ clientId, provider, integration }) => {
  const { toggle, toggleTool, test, remove } = useAiIntegrationMutations(clientId, provider.key);

  const FormDialog = INTEGRATION_FORMS[provider.key];
  const hasNoEnabledTools = !!integration?.enabled && integration.tools.every((tool) => !tool.enabled);

  const handleRemove = () => {
    remove.mutate(undefined, {
      onSuccess: () => {
        test.reset();
        toast.success(`${provider.name} removido`);
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {provider.name}
          {integration && (
            <Badge variant={integration.enabled ? "default" : "secondary"}>{integration.enabled ? "Ativa" : "Desligada"}</Badge>
          )}
        </CardTitle>
        <CardDescription>{provider.description}</CardDescription>
        {integration && (
          <CardAction>
            <Switch
              aria-label={integration.enabled ? `Desligar ${provider.name}` : `Ligar ${provider.name}`}
              checked={integration.enabled}
              onCheckedChange={(enabled) => toggle.mutate(enabled)}
              disabled={toggle.isPending}
            />
          </CardAction>
        )}
      </CardHeader>

      {integration?.enabled && (
        <CardContent className="space-y-3">
          <p className="text-sm font-semibold">Ferramentas</p>
          <ul className="divide-y rounded-md border">
            {integration.tools.map((tool) => {
              const meta = getToolMeta(tool);
              return (
                <li key={tool.name} className="flex items-start justify-between gap-4 p-3">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-sm font-medium">
                      {meta.label}
                      {meta.destructive && <Badge variant="destructive">Altera a agenda</Badge>}
                    </p>
                    {meta.label !== tool.description && <p className="text-muted-foreground text-sm">{tool.description}</p>}
                  </div>
                  <Switch
                    aria-label={meta.label}
                    checked={tool.enabled}
                    onCheckedChange={(enabled) => toggleTool.mutate({ toolName: tool.name, enabled })}
                    disabled={toggleTool.isPending}
                  />
                </li>
              );
            })}
          </ul>

          {hasNoEnabledTools && (
            <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
              Nenhuma ferramenta está ligada. A integração está ativa, mas a IA não vai usá-la.
            </div>
          )}
        </CardContent>
      )}

      <CardFooter className="flex-col items-stretch gap-3">
        <div className="flex flex-wrap gap-2">
          {FormDialog ? (
            <FormDialog clientId={clientId} provider={provider} integration={integration} />
          ) : (
            <Button size="sm" disabled>
              Em breve
            </Button>
          )}
          {integration && (
            <>
              <Button variant="outline" size="sm" onClick={() => test.mutate()} disabled={test.isPending}>
                Testar conexão
              </Button>
              <AlertDialogRemoveAiIntegration providerName={provider.name} isPending={remove.isPending} onConfirm={handleRemove} />
            </>
          )}
        </div>
        <ConnectionTestResult status={test.status} error={test.error} />
      </CardFooter>
    </Card>
  );
};
