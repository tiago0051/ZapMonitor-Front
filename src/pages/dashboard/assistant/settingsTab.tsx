import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { assistantService } from "@/services/api/assistantService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { assistantKeys } from "./assistantUtils";

/** Regras do tenant para os planos do assistente; só quem gerencia membros altera. */
export const SettingsTab: FC = () => {
  const { client } = useClientContext();
  const settingsQuery = useQuery({
    queryKey: assistantKeys.settings(client.id),
    queryFn: () => assistantService.findSettings(client.id),
  });

  if (settingsQuery.isLoading) return <LoadingState label="Carregando regras..." />;
  if (settingsQuery.isError || !settingsQuery.data)
    return (
      <ErrorState
        message="Não foi possível buscar as regras."
        onRetry={() => settingsQuery.refetch()}
        isRetrying={settingsQuery.isFetching}
      />
    );

  return <SettingsForm key={settingsQuery.dataUpdatedAt} settings={settingsQuery.data} />;
};

const SettingsForm: FC<{ settings: AssistantSettings }> = ({ settings }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canEdit = can("members.manage");
  const [requireSecondApprover, setRequireSecondApprover] = useState(settings.requireSecondApprover);
  const [reviewAfterDays, setReviewAfterDays] = useState(String(settings.reviewAfterDays));

  const days = Number(reviewAfterDays);
  const daysValid = reviewAfterDays.trim() !== "" && Number.isInteger(days) && days >= 0 && days <= 90;
  const changed = requireSecondApprover !== settings.requireSecondApprover || days !== settings.reviewAfterDays;

  const save = useMutation({
    mutationFn: (body: AssistantSettings) => assistantService.saveSettings(client.id, body),
    onSuccess: (saved) => {
      queryClient.setQueryData(assistantKeys.settings(client.id), saved);
      toast.success("Regras salvas");
    },
    onError: requestErrorHandling,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!daysValid) return;
    save.mutate({ requireSecondApprover, reviewAfterDays: days });
  };

  return (
    <form onSubmit={handleSubmit} className="grid max-w-xl gap-6">
      {!canEdit && <p className="bg-muted/50 rounded-md px-3 py-2 text-sm">Só quem gerencia os usuários pode mudar estas regras.</p>}

      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="grid gap-1">
          <Label htmlFor="assistant-second-approver">Passos sensíveis precisam de outra pessoa para aprovar</Label>
          <p className="text-muted-foreground text-xs">
            Mandar mensagem a clientes, gastar verba, enviar modelo à Meta ou pôr fluxo no ar: quem pediu o plano não aprova sozinho.
          </p>
        </div>
        <Switch
          id="assistant-second-approver"
          checked={requireSecondApprover}
          disabled={!canEdit}
          onCheckedChange={setRequireSecondApprover}
        />
      </div>

      <div className="grid gap-2 rounded-lg border p-4">
        <Label htmlFor="assistant-review-days">Revisar o efeito depois de quantos dias</Label>
        <p className="text-muted-foreground text-xs">
          O assistente volta ao plano executado e diz se a mudança surtiu efeito. Use 0 para desligar.
        </p>
        <Input
          id="assistant-review-days"
          type="number"
          inputMode="numeric"
          min={0}
          max={90}
          step={1}
          value={reviewAfterDays}
          disabled={!canEdit}
          onChange={(event) => setReviewAfterDays(event.target.value)}
          aria-invalid={!daysValid}
          aria-describedby={!daysValid ? "assistant-review-days-error" : undefined}
          className="w-32"
        />
        {!daysValid && (
          <p id="assistant-review-days-error" className="text-destructive text-sm">
            Use um número inteiro de 0 a 90.
          </p>
        )}
      </div>

      {canEdit && (
        <div>
          <Button type="submit" disabled={!changed || !daysValid || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar regras
          </Button>
        </div>
      )}
    </form>
  );
};
