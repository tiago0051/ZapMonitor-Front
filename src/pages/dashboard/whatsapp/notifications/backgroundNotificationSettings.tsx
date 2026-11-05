import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { pushService, type BackgroundNotificationPreference } from "@/services/api/pushService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Smartphone } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { useBackgroundPush } from "./useBackgroundPush";

const options: { key: keyof BackgroundNotificationPreference; label: string; description: string }[] = [
  { key: "queue", label: "Contato novo na fila", description: "Nos grupos de atendimento em que você está." },
  { key: "mine", label: "Mensagem nos meus atendimentos", description: "Cada mensagem nova de quem você está atendendo." },
  { key: "assigned", label: "Atribuído a mim", description: "Quando alguém transferir um atendimento para você." },
];

/** Notificações que chegam com o app fechado: ligar neste aparelho e escolher o que receber neste cliente. */
export const BackgroundNotificationSettings: FC = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const push = useBackgroundPush();
  const queryKey = ["push", "preference", client.id];

  const preferenceQuery = useQuery({ queryKey, queryFn: () => pushService.findPreference(client.id), enabled: push.status === "on" });
  const savePreference = useMutation({
    mutationFn: (preference: BackgroundNotificationPreference) => pushService.savePreference(client.id, preference),
    onMutate: (preference) => queryClient.setQueryData(queryKey, preference),
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey });
      requestErrorHandling(error);
    },
  });
  const sendTest = useMutation({
    mutationFn: pushService.sendTest,
    onError: requestErrorHandling,
    onSuccess: ({ delivered }) =>
      delivered > 0
        ? toast.success("Notificação de teste enviada", { description: "Ela aparece quando o app não está em primeiro plano." })
        : toast.error("Nenhum aparelho recebeu o teste", { description: "Desative e ative de novo as notificações neste aparelho." }),
  });

  const preference = preferenceQuery.data;

  return (
    <div className="space-y-2.5 border-t pt-3">
      <div className="flex items-start gap-2">
        <Smartphone className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Com o app fechado</p>
          <p className="text-muted-foreground text-xs">Notificações no celular ou no computador mesmo sem o ZapMonitor aberto.</p>
        </div>
      </div>

      {push.isChecking && <p className="text-muted-foreground text-xs">Verificando este aparelho…</p>}

      {!push.isChecking && push.status === "needsInstall" && (
        <p className="rounded-md bg-sky-50 p-2 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          No iPhone, instale o app primeiro: no Safari, toque em Compartilhar → Adicionar à Tela de Início. Depois abra o ZapMonitor pelo
          ícone e ative aqui. Precisa do iOS 16.4 ou mais novo.
        </p>
      )}
      {!push.isChecking && push.status === "unsupported" && (
        <p className="text-muted-foreground text-xs">Este navegador não recebe notificações com o app fechado.</p>
      )}
      {!push.isChecking && push.status === "unavailable" && (
        <p className="text-muted-foreground text-xs">As notificações com o app fechado ainda não estão disponíveis.</p>
      )}
      {!push.isChecking && push.status === "denied" && (
        <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          As notificações deste site estão bloqueadas. Libere nas configurações do navegador (ou do app) e volte aqui.
        </p>
      )}

      {!push.isChecking && push.status === "off" && (
        <Button size="sm" className="w-full" disabled={push.isBusy} onClick={push.enable}>
          {push.isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          Ativar neste aparelho
        </Button>
      )}

      {!push.isChecking && push.status === "on" && (
        <>
          {options.map((option) => (
            <label key={option.key} className="flex cursor-pointer items-start gap-2.5">
              <Checkbox
                className="mt-0.5"
                checked={preference?.[option.key] ?? false}
                disabled={!preference}
                onCheckedChange={(checked) => preference && savePreference.mutate({ ...preference, [option.key]: checked === true })}
              />
              <span>
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="text-muted-foreground block text-xs">{option.description}</span>
              </span>
            </label>
          ))}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" disabled={sendTest.isPending} onClick={() => sendTest.mutate()}>
              {sendTest.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar teste
            </Button>
            <Button size="sm" variant="ghost" disabled={push.isBusy} onClick={push.disable}>
              Desativar
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">As escolhas valem para este cliente em todos os seus aparelhos.</p>
        </>
      )}

      {push.error && <p className="text-destructive text-xs">{push.error}</p>}
    </div>
  );
};
