import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Scale } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type Key = keyof AdEvidenceThresholdValues;

const FIELDS: { key: Key; label: string; help: string; min: number; max: number }[] = [
  { key: "minDeliveryDays", label: "Dias no ar", help: "Dias com entrega antes de julgar", min: 1, max: 30 },
  {
    key: "minImpressions",
    label: "Impressões",
    help: "Mínimo de impressões; sem custo médio na conta, pede o dobro",
    min: 100,
    max: 100000,
  },
  {
    key: "expectedConversations",
    label: "Conversas pelo gasto",
    help: "Gasto que, no custo médio por conversa da conta, já traria estas conversas",
    min: 1,
    max: 50,
  },
  {
    key: "minConversationsForDeals",
    label: "Conversas antes de cobrar negócio",
    help: "Com menos conversas, a falta de negócio no CRM ainda não conta",
    min: 1,
    max: 200,
  },
];

type Draft = Record<Key, string>;

const toDraft = (custom: AdEvidenceThresholds["custom"]): Draft =>
  Object.fromEntries(FIELDS.map(({ key }) => [key, custom[key] === null ? "" : String(custom[key])])) as Draft;

/** Régua da conta para o piloto e as sugestões julgarem se um anúncio está bom ou ruim. */
export const EvidenceThresholdsSettings: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const canEdit = can("ads.manage");

  const query = useQuery({
    queryKey: ["metaAds", "evidenceThresholds", account.id],
    queryFn: () => metaAdsService.findEvidenceThresholds({ params }),
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (values: Draft) =>
      metaAdsService.setEvidenceThresholds({
        params,
        body: Object.fromEntries(
          FIELDS.map(({ key }) => [key, values[key].trim() === "" ? null : Number(values[key])]),
        ) as AdEvidenceThresholds["custom"],
      }),
    onError: requestErrorHandling,
    onSuccess: (data) => {
      queryClient.setQueryData(["metaAds", "evidenceThresholds", account.id], data);
      queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotScoreboard"] });
      setDraft(null);
      toast.success("Régua salva", { description: "Vale nas próximas análises e execuções do piloto." });
    },
  });

  const data = query.data;
  const values = draft ?? (data ? toDraft(data.custom) : null);
  const invalid = values
    ? FIELDS.find(({ key, min, max }) => {
        const raw = values[key].trim();
        if (!raw) return false;
        const value = Number(raw);
        return !Number.isInteger(value) || value < min || value > max;
      })
    : undefined;

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        className="hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Scale className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="flex-1">
          <span className="font-medium">Régua de dados suficientes</span>
          <span className="text-muted-foreground block text-xs">
            Quando o piloto e as sugestões já podem dizer se um anúncio está bom ou ruim
          </span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open && values && data && (
        <form
          className="grid gap-3 border-t p-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!invalid) save.mutate(values);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="grid gap-1">
                <Label htmlFor={`evidence-${field.key}`} className="text-xs">
                  {field.label}
                </Label>
                <Input
                  id={`evidence-${field.key}`}
                  type="number"
                  min={field.min}
                  max={field.max}
                  value={values[field.key]}
                  placeholder={`Padrão: ${data.defaults[field.key].toLocaleString("pt-BR")}`}
                  disabled={!canEdit || save.isPending}
                  onChange={(event) => setDraft({ ...values, [field.key]: event.target.value })}
                />
                <p className="text-muted-foreground text-xs">{field.help}</p>
              </div>
            ))}
          </div>
          {invalid && (
            <p className="text-destructive text-xs">
              {invalid.label}: use um número inteiro de {invalid.min} a {invalid.max.toLocaleString("pt-BR")}.
            </p>
          )}
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={!!invalid || save.isPending || !draft}>
                Salvar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={save.isPending}
                onClick={() => setDraft(Object.fromEntries(FIELDS.map(({ key }) => [key, ""])) as Draft)}
              >
                Voltar ao padrão
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
};
