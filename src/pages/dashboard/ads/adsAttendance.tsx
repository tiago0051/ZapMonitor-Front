import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { sendWindowError } from "@/pages/dashboard/broadcasts/broadcastUtils";
import { SendWindowFields } from "@/pages/dashboard/broadcasts/components/sendWindowFields";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";

const SettingsForm: FC<{ settings: AdAttendanceSettings; canEdit: boolean }> = ({ settings, canEdit }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(settings);
  const save = useMutation({
    mutationFn: () => metaAdsService.saveAttendanceSettings(client.id, values),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.setQueryData(["metaAds", "attendanceSettings", client.id], saved);
      toast.success(saved.enabled ? "Verba pelo atendimento ligada" : "Verba pelo atendimento salva");
    },
  });
  const number = (key: "queueLimit" | "maxWaitMinutes" | "reducePercent") => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues({ ...values, [key]: Number(event.target.value) });
  const error = sendWindowError(values.hours);
  const disabled = !canEdit || save.isPending;

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          className="mt-0.5"
          checked={values.enabled}
          disabled={disabled}
          onCheckedChange={(checked) => setValues({ ...values, enabled: checked === true })}
        />
        <span>
          Propor mudanças de verba pela fila do atendimento
          <span className="text-muted-foreground block text-xs">
            A cada 15 minutos, no horário da equipe: com a fila do grupo que atende um conjunto cheia, propõe reduzir a verba dele; quando a
            fila anda, propõe voltar ao valor de antes. Toda proposta pede aprovação, chega no celular de quem aprova e vence se a fila
            mudar.
          </span>
        </span>
      </label>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="attendance-queue-limit" className="text-xs">
            Fila cheia com (pessoas esperando)
          </Label>
          <Input
            id="attendance-queue-limit"
            type="number"
            min={1}
            max={500}
            value={values.queueLimit}
            disabled={disabled}
            onChange={number("queueLimit")}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="attendance-max-wait" className="text-xs">
            Ou o primeiro esperando há (min)
          </Label>
          <Input
            id="attendance-max-wait"
            type="number"
            min={1}
            max={600}
            value={values.maxWaitMinutes}
            disabled={disabled}
            onChange={number("maxWaitMinutes")}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="attendance-reduce" className="text-xs">
            Reduzir a verba em (%)
          </Label>
          <Input
            id="attendance-reduce"
            type="number"
            min={5}
            max={90}
            value={values.reducePercent}
            disabled={disabled}
            onChange={number("reducePercent")}
          />
        </div>
      </div>
      <div className="grid gap-1">
        <p className="text-xs font-medium">Horário da equipe</p>
        <SendWindowFields
          value={values.hours}
          onChange={(hours) => hours && setValues({ ...values, hours })}
          idPrefix="attendance-hours"
          disabled={disabled}
        />
      </div>
      {canEdit && (
        <Button size="sm" disabled={disabled || !!error} onClick={() => save.mutate()}>
          {save.isPending ? "Salvando..." : "Salvar"}
        </Button>
      )}
    </div>
  );
};

/** Verba no ritmo do atendimento: limites da fila, horário da equipe e a fila de cada grupo agora. */
export const AdsAttendance = () => {
  const { client, can } = useClientContext();
  const settingsQuery = useQuery({
    queryKey: ["metaAds", "attendanceSettings", client.id],
    queryFn: () => metaAdsService.findAttendanceSettings(client.id),
  });
  const queuesQuery = useQuery({
    queryKey: ["metaAds", "attendanceQueues", client.id],
    queryFn: () => metaAdsService.findAttendanceQueues(client.id),
    refetchInterval: 60_000,
  });
  const settings = settingsQuery.data;
  const queues = queuesQuery.data ?? [];

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-semibold">Verba pelo atendimento</h3>
        <p className="text-muted-foreground text-xs">Lead que espera esfria: a verba acompanha o que a equipe consegue atender.</p>
      </div>
      {settings && <SettingsForm key={JSON.stringify(settings)} settings={settings} canEdit={can("ads.manage")} />}
      {queues.length > 0 && settings && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs font-medium">Fila agora</p>
          <ul className="flex flex-wrap gap-2">
            {queues.map((queue) => {
              const full =
                queue.waiting >= settings.queueLimit ||
                (queue.oldestWaitMinutes !== null && queue.oldestWaitMinutes >= settings.maxWaitMinutes);
              return (
                <li
                  key={queue.serviceGroupId}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs",
                    full
                      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
                      : "text-muted-foreground",
                  )}
                >
                  <span className="text-foreground font-medium">{queue.name}</span>: {queue.waiting} esperando
                  {queue.oldestWaitMinutes !== null && ` · primeiro há ${queue.oldestWaitMinutes} min`}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
