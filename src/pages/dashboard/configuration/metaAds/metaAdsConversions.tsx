import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { conversionEventLabel } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";

const EVENT_NAMES: ConversionEventName[] = ["LEAD_SUBMITTED", "QUALIFIED_LEAD", "PURCHASE"];

/** Quantos eventos de cada nome a Meta aceitou, recusou ou não puderam ir nos últimos 7 dias. */
const ConversionHealth: FC<{ health: ConversionSettings["health"] }> = ({ health }) => {
  const count = (eventName: ConversionEventName, status: ConversionEventStatus) =>
    health.find((row) => row.eventName === eventName && row.status === status)?.count ?? 0;

  if (health.length === 0) return <p className="text-muted-foreground text-xs">Nenhum evento nos últimos 7 dias.</p>;

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {EVENT_NAMES.map((eventName) => {
        const sent = count(eventName, "SENT");
        const failed = count(eventName, "FAILED");
        const skipped = count(eventName, "SKIPPED");
        const pending = count(eventName, "PENDING");
        const total = sent + failed;

        return (
          <div key={eventName} className="rounded-lg border p-2 text-xs">
            <p className="font-medium">{conversionEventLabel[eventName]}</p>
            <p className="text-lg font-semibold tabular-nums">{total === 0 ? "—" : `${Math.round((sent / total) * 100)}%`}</p>
            <p className="text-muted-foreground">
              {sent} aceitos · {failed} com erro · {skipped} sem atribuição{pending > 0 && ` · ${pending} na fila`}
            </p>
          </div>
        );
      })}
    </div>
  );
};

const ConversionForm: FC<{ settings: ConversionSettings }> = ({ settings }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<ConversionSettingsValues>({
    enabled: settings.enabled,
    leadSubmittedOnCreate: settings.leadSubmittedOnCreate,
    leadsDatasetId: settings.leadsDatasetId,
    testEventCode: settings.testEventCode,
  });
  const isDatasetValid = !values.leadsDatasetId || /^\d+$/.test(values.leadsDatasetId.trim());

  const save = useMutation({
    mutationFn: metaAdsService.saveConversionSettings,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "conversionSettings"] });
      toast.success("Eventos de conversão salvos");
    },
  });

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          className="mt-0.5"
          checked={values.enabled}
          onCheckedChange={(checked) => setValues({ ...values, enabled: checked === true })}
        />
        <span>
          Mandar os eventos do funil para a Meta
          <span className="text-muted-foreground block text-xs">
            Só negócios vindos de anúncio. O evento de cada etapa é escolhido na configuração do funil.
          </span>
        </span>
      </label>
      <label className="flex cursor-pointer items-start gap-2 text-sm">
        <Checkbox
          className="mt-0.5"
          checked={values.leadSubmittedOnCreate}
          disabled={!values.enabled}
          onCheckedChange={(checked) => setValues({ ...values, leadSubmittedOnCreate: checked === true })}
        />
        <span>
          Mandar LeadSubmitted quando o negócio é criado
          <span className="text-muted-foreground block text-xs">Desligue se alguma etapa aberta já manda esse evento.</span>
        </span>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1">
          <Label htmlFor="conversion-leads-dataset" className="text-xs">
            Conjunto de dados dos leads de formulário
          </Label>
          <Input
            id="conversion-leads-dataset"
            inputMode="numeric"
            placeholder="Id do pixel ou conjunto de dados"
            value={values.leadsDatasetId ?? ""}
            onChange={(event) => setValues({ ...values, leadsDatasetId: event.target.value || null })}
            aria-invalid={!isDatasetValid}
          />
          <p className="text-muted-foreground text-xs">
            Gerenciador de Eventos → conjunto de dados ligado à página dos formulários. Os eventos de WhatsApp usam o conjunto da WABA,
            criado sozinho.
          </p>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="conversion-test-code" className="text-xs">
            Código de teste
          </Label>
          <Input
            id="conversion-test-code"
            placeholder="TEST12345"
            maxLength={50}
            value={values.testEventCode ?? ""}
            onChange={(event) => setValues({ ...values, testEventCode: event.target.value || null })}
          />
          <p className="text-muted-foreground text-xs">
            Com o código, os eventos aparecem só em Testar eventos e não contam nas campanhas. Apague depois de conferir.
          </p>
        </div>
      </div>

      <Button
        size="sm"
        disabled={save.isPending || !isDatasetValid}
        onClick={() => save.mutate({ params: { clientId: client.id }, body: values })}
      >
        Salvar
      </Button>
    </div>
  );
};

/** Envio dos eventos do funil para a Meta (Conversions API) e a saúde dos últimos 7 dias. */
export const MetaAdsConversions = () => {
  const { client } = useClientContext();

  const settingsQuery = useQuery({
    queryKey: ["metaAds", "conversionSettings", client.id],
    queryFn: () => metaAdsService.findConversionSettings({ params: { clientId: client.id } }),
  });
  const settings = settingsQuery.data;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Eventos de conversão</h3>
        <p className="text-muted-foreground text-xs">
          A Meta passa a otimizar as campanhas para quem vira lead qualificado e compra, não só para quem inicia conversa.
        </p>
      </div>

      {settingsQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {settings && (
        <>
          <ConversionForm
            key={`${settings.enabled}-${settings.leadSubmittedOnCreate}-${settings.leadsDatasetId}-${settings.testEventCode}`}
            settings={settings}
          />
          {settings.testEventCode && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              O código de teste está ligado: os eventos não contam nas campanhas.
            </p>
          )}
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs font-medium">Últimos 7 dias</p>
            <ConversionHealth health={settings.health} />
          </div>
        </>
      )}
    </section>
  );
};
