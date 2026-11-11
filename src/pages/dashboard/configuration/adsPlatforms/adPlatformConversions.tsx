import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";

const EVENT_LABEL: Record<ConversionEventName, string> = {
  LEAD_SUBMITTED: "Conversa iniciada",
  QUALIFIED_LEAD: "Lead qualificado",
  PURCHASE: "Venda",
};

/**
 * Devolve as etapas do funil à plataforma para ela otimizar por venda: no Google, conversões offline pelo gclid; no
 * TikTok, a Events API com o ttclid. Os eventos de cada etapa são os mesmos configurados no funil.
 */
export const AdPlatformConversions: FC<{ platform: "GOOGLE" | "TIKTOK"; accounts: AdAccount[] }> = ({ platform, accounts }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, platform };

  const settingsQuery = useQuery({
    queryKey: ["metaAds", "platform", platform, "conversions", client.id],
    queryFn: () => adsPlatformService.findConversionSettings({ params }),
  });
  const onSaved = (data: PlatformConversionSettings) => {
    queryClient.setQueryData(["metaAds", "platform", platform, "conversions", client.id], data);
    toast.success("Envio de eventos salvo");
  };
  const save = useMutation({ mutationFn: adsPlatformService.saveConversionSettings, onError: requestErrorHandling, onSuccess: onSaved });
  const createActions = useMutation({
    mutationFn: adsPlatformService.createGoogleConversionActions,
    onError: requestErrorHandling,
    onSuccess: (data) => {
      queryClient.setQueryData(["metaAds", "platform", platform, "conversions", client.id], data);
      toast.success("Ações de conversão prontas no Google Ads");
    },
  });

  const settings = settingsQuery.data;
  if (!settings) return null;

  return (
    <ConversionsForm
      // Recria o formulário quando o servidor devolve outra configuração
      key={JSON.stringify(settings)}
      platform={platform}
      accounts={accounts}
      settings={settings}
      isSaving={save.isPending}
      isCreatingActions={createActions.isPending}
      onSave={(body) => save.mutate({ params, body })}
      onCreateActions={(adAccountId) => createActions.mutate({ params: { clientId: client.id }, body: { adAccountId } })}
    />
  );
};

type ConversionsFormProps = {
  platform: "GOOGLE" | "TIKTOK";
  accounts: AdAccount[];
  settings: PlatformConversionSettings;
  isSaving: boolean;
  isCreatingActions: boolean;
  onSave: (body: { enabled: boolean; adAccountId?: string | null; pixelCode?: string | null; testEventCode?: string | null }) => void;
  onCreateActions: (adAccountId: string) => void;
};

const ConversionsForm: FC<ConversionsFormProps> = ({
  platform,
  accounts,
  settings,
  isSaving,
  isCreatingActions,
  onSave,
  onCreateActions,
}) => {
  const [form, setForm] = useState(() => ({
    enabled: settings.enabled,
    adAccountId: settings.adAccountId ?? accounts[0]?.id ?? "",
    pixelCode: settings.pixelCode ?? "",
    testEventCode: settings.testEventCode ?? "",
  }));

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Enviar as vendas para o {platform === "GOOGLE" ? "Google Ads" : "TikTok"}</h3>
        <p className="text-muted-foreground text-xs">
          Cada etapa do funil com evento (conversa iniciada, lead qualificado e venda) vai para a plataforma, que passa a otimizar pelo que
          vira venda. Só entram negócios de conversas que chegaram pelos links acima.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border p-3">
        {platform === "GOOGLE" ? (
          <>
            <div className="grid gap-1 sm:max-w-sm">
              <Label htmlFor="google-conversion-account" className="text-xs">
                Conta do Google Ads que recebe as conversões
              </Label>
              <select
                id="google-conversion-account"
                className={crmSelectClassName}
                value={form.adAccountId}
                onChange={(event) => setForm({ ...form, adAccountId: event.target.value })}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {(["LEAD_SUBMITTED", "QUALIFIED_LEAD", "PURCHASE"] as ConversionEventName[]).map((event) => (
                <span
                  key={event}
                  className={settings.readyEvents.includes(event) ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}
                >
                  {settings.readyEvents.includes(event) ? "✓" : "○"} {EVENT_LABEL[event]}
                </span>
              ))}
              <Button
                size="sm"
                variant="outline"
                disabled={!form.adAccountId || isCreatingActions}
                onClick={() => onCreateActions(form.adAccountId)}
              >
                {settings.readyEvents.length === 3 ? "Conferir ações de conversão" : "Criar ações de conversão"}
              </Button>
            </div>
          </>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="tiktok-pixel" className="text-xs">
                Código do pixel (Gerenciador de Eventos do TikTok)
              </Label>
              <Input id="tiktok-pixel" value={form.pixelCode} onChange={(event) => setForm({ ...form, pixelCode: event.target.value })} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="tiktok-test-code" className="text-xs">
                Código de teste (opcional)
              </Label>
              <Input
                id="tiktok-test-code"
                value={form.testEventCode}
                onChange={(event) => setForm({ ...form, testEventCode: event.target.value })}
              />
            </div>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={form.enabled} onCheckedChange={(checked) => setForm({ ...form, enabled: checked === true })} />
          Enviar os eventos do funil
        </label>
        <div>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() =>
              onSave({
                enabled: form.enabled,
                ...(platform === "GOOGLE"
                  ? { adAccountId: form.adAccountId || null }
                  : { pixelCode: form.pixelCode || null, testEventCode: form.testEventCode || null }),
              })
            }
          >
            Salvar
          </Button>
        </div>
      </div>
    </section>
  );
};
