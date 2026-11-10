import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { undoableAction } from "@/lib/undoToast";
import { cn } from "@/lib/utils";
import { AlertTriangle, Film, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FC, type ReactNode } from "react";
import { AdvisorText } from "../components/advisorText";
import { MetricHelp } from "../components/metricHelp";
import { AdsAssetLibrary } from "./adsAssetLibrary";
import { fieldSelectClassName } from "./campaignUtils";
import { CountryPicker } from "./countryPicker";
import type { CampaignAudienceOption } from "./useCampaignOptions";

const textarea = "border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm";

const specialCategoryLabel: Record<SpecialAdCategory, string> = {
  NONE: "Nenhuma",
  FINANCIAL_PRODUCTS_SERVICES: "Produtos e serviços financeiros (crédito, seguro…)",
  EMPLOYMENT: "Emprego",
  HOUSING: "Moradia",
};

const nextKey = (prefix: string, keys: string[]) => {
  let index = keys.length + 1;
  while (keys.includes(`${prefix}-${index}`)) index++;
  return `${prefix}-${index}`;
};

type AudiencePickerProps = { label: string; selected: string[]; audiences: CampaignAudienceOption[]; onChange: (ids: string[]) => void };

const AudiencePicker: FC<AudiencePickerProps> = ({ label, selected, audiences, onChange }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="sm" className="h-8 justify-start text-xs font-normal">
        {label}: {selected.length ? `${selected.length} público(s)` : "nenhum"}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="max-h-72 w-72 space-y-1 overflow-y-auto">
      {audiences.length === 0 && (
        <p className="text-muted-foreground text-xs">Nenhum público na conta. Crie a partir do CRM na aba Públicos.</p>
      )}
      {audiences.map((audience) => (
        <label key={audience.id} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={selected.includes(audience.id)}
            onCheckedChange={(checked) => onChange(checked ? [...selected, audience.id] : selected.filter((id) => id !== audience.id))}
          />
          <span className="truncate">
            {audience.name}
            {audience.origin === "crm" && <span className="text-muted-foreground"> · CRM</span>}
            {audience.isLookalike && <span className="text-muted-foreground"> · semelhante</span>}
          </span>
        </label>
      ))}
    </PopoverContent>
  </Popover>
);

type AssetPickerProps = { open: boolean; onOpenChange: (open: boolean) => void; children: ReactNode };

/** Biblioteca de criativos em janela (computador) ou painel de baixo (celular) para escolher o criativo do anúncio. */
const AssetPicker: FC<AssetPickerProps> = ({ open, onOpenChange, children }) => {
  const isMobile = useIsMobile();
  const title = "Escolha a imagem ou o vídeo";
  const description = "Toque em um criativo da biblioteca ou envie um novo.";

  if (isMobile)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{children}</div>
        </SheetContent>
      </Sheet>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

type PlanEditorProps = {
  account: AdAccount;
  plan: AdCampaignPlan;
  audiences: CampaignAudienceOption[];
  assets: AdCreativeAsset[];
  disabled: boolean;
  onChange: (plan: AdCampaignPlan) => void;
};

/** Plano editável: campanha, conjuntos com público, anúncios com textos e criativo, e o teste A/B. */
export const PlanEditor: FC<PlanEditorProps> = ({ account, plan, audiences, assets, disabled, onChange }) => {
  const [pickingAssetFor, setPickingAssetFor] = useState<string | null>(null);
  const set = (changes: Partial<AdCampaignPlan>) => onChange({ ...plan, ...changes });
  const setAdSet = (key: string, changes: Partial<AdPlanAdSet>) =>
    set({ adSets: plan.adSets.map((adSet) => (adSet.key === key ? { ...adSet, ...changes } : adSet)) });
  const setCreative = (key: string, changes: Partial<AdPlanCreative>) =>
    set({ creatives: plan.creatives.map((creative) => (creative.key === key ? { ...creative, ...changes } : creative)) });
  const special = plan.specialAdCategory !== "NONE";
  const { confirm, confirmDialog } = useConfirm();
  // Plano mais recente, para o "Desfazer" devolver o anúncio sem perder o que foi editado depois
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  const removeAdSet = async (adSet: AdPlanAdSet) => {
    const adsCount = plan.creatives.filter((creative) => creative.adSetKey === adSet.key).length;
    if (
      adsCount > 0 &&
      !(await confirm({
        title: `Tirar o conjunto "${adSet.name}"?`,
        description: `Os ${adsCount} anúncio(s) dele também saem do plano.`,
        confirmLabel: "Tirar conjunto",
        destructive: true,
      }))
    )
      return;
    const current = planRef.current;
    onChange({
      ...current,
      adSets: current.adSets.filter((item) => item.key !== adSet.key),
      creatives: current.creatives.filter((creative) => creative.adSetKey !== adSet.key),
    });
  };
  const removeCreative = (creative: AdPlanCreative) => {
    const index = plan.creatives.findIndex((item) => item.key === creative.key);
    set({ creatives: plan.creatives.filter((item) => item.key !== creative.key) });
    undoableAction({
      message: `"${creative.name}" saiu do plano`,
      commit: () => undefined,
      onUndo: () => {
        const current = planRef.current;
        const creatives = [...current.creatives];
        creatives.splice(Math.min(index, creatives.length), 0, creative);
        onChange({ ...current, creatives });
      },
    });
  };

  const addAdSet = () => {
    const key = nextKey(
      "set",
      plan.adSets.map((adSet) => adSet.key),
    );
    set({
      adSets: [
        ...plan.adSets,
        {
          key,
          name: `Conjunto ${plan.adSets.length + 1}`,
          ageMin: 18,
          ageMax: 65,
          countries: ["BR"],
          advantageAudience: true,
          includeAudienceIds: [],
          excludeAudienceIds: [],
          rationale: null,
        },
      ],
    });
  };
  const addCreative = (adSetKey: string) => {
    const key = nextKey(
      "ad",
      plan.creatives.map((creative) => creative.key),
    );
    set({
      creatives: [
        ...plan.creatives,
        {
          key,
          adSetKey,
          name: `Anúncio ${plan.creatives.length + 1}`,
          primaryText: "",
          headline: "",
          description: null,
          welcomeMessage: "",
          assetId: null,
          advantageEnhancements: true,
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      {confirmDialog}
      {plan.reasoning && (
        <div className="border-primary/20 bg-primary/5 rounded-lg border p-3">
          <p className="text-primary mb-1 text-xs font-semibold">Por que este plano</p>
          <AdvisorText text={plan.reasoning} />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="plan-name" className="text-xs">
            Nome da campanha
          </Label>
          <Input
            id="plan-name"
            maxLength={200}
            disabled={disabled}
            value={plan.campaignName}
            onChange={(event) => set({ campaignName: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="plan-category" className="text-xs">
            Categoria especial
          </Label>
          <select
            id="plan-category"
            className={fieldSelectClassName}
            disabled={disabled}
            value={plan.specialAdCategory}
            onChange={(event) => set({ specialAdCategory: event.target.value as SpecialAdCategory })}
          >
            {(Object.keys(specialCategoryLabel) as SpecialAdCategory[]).map((category) => (
              <option key={category} value={category}>
                {specialCategoryLabel[category]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="plan-budget" className="text-xs">
            Verba diária ({account.currency})
          </Label>
          <Input
            id="plan-budget"
            type="number"
            min={1}
            step="0.01"
            disabled={disabled}
            value={plan.dailyBudget || ""}
            onChange={(event) => set({ dailyBudget: event.target.valueAsNumber || 0 })}
          />
        </div>
      </div>
      {special && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Na categoria especial a Meta não deixa limitar idade e gênero nem usar público semelhante; a idade vai de 18 a 65.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={plan.abTest.enabled}
          disabled={disabled}
          onCheckedChange={(checked) => set({ abTest: { ...plan.abTest, enabled: checked === true } })}
        />
        Teste A/B entre dois conjuntos
        {plan.abTest.enabled && (
          <select
            aria-label="O que o teste compara"
            className={`${fieldSelectClassName} h-8 text-xs`}
            disabled={disabled}
            value={plan.abTest.variable}
            onChange={(event) => set({ abTest: { ...plan.abTest, variable: event.target.value as AdCampaignPlan["abTest"]["variable"] } })}
          >
            <option value="creative">comparando criativos</option>
            <option value="audience">comparando públicos</option>
          </select>
        )}
      </label>
      {plan.abTest.enabled && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">
            A verba é dividida igualmente entre os dois conjuntos para a comparação ser justa.
          </p>
          <Label htmlFor="ab-test-hypothesis" className="text-xs">
            O que você quer descobrir (hipótese)
          </Label>
          <textarea
            id="ab-test-hypothesis"
            className={textarea}
            maxLength={2000}
            disabled={disabled}
            placeholder="O anúncio com preço vende com menor custo por venda que o de dor"
            value={plan.abTest.hypothesis ?? ""}
            onChange={(event) => set({ abTest: { ...plan.abTest, hypothesis: event.target.value || null } })}
          />
          <p className="text-muted-foreground text-xs">
            Depois de publicar, a campanha vira um teste na aba Testes e o resultado vai para o diário.
          </p>
        </div>
      )}

      {plan.adSets.map((adSet, index) => (
        <div key={adSet.key} className="space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            {plan.abTest.enabled && (
              <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-xs font-semibold">{index === 0 ? "A" : "B"}</span>
            )}
            <Input
              aria-label="Nome do conjunto"
              className="h-8 max-w-sm"
              maxLength={200}
              disabled={disabled}
              value={adSet.name}
              onChange={(event) => setAdSet(adSet.key, { name: event.target.value })}
            />
            {!disabled && plan.adSets.length > 1 && (
              <Button
                size="icon"
                variant="ghost"
                className="ml-auto h-8 w-8"
                aria-label={`Tirar ${adSet.name}`}
                onClick={() => void removeAdSet(adSet)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          {adSet.rationale && <p className="text-muted-foreground text-xs">{adSet.rationale}</p>}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <label className="flex items-center gap-1">
              Idade
              <Input
                type="number"
                aria-label="Idade mínima"
                min={18}
                max={65}
                className="h-8 w-16 text-xs"
                disabled={disabled || special}
                value={special ? 18 : adSet.ageMin}
                onChange={(event) => setAdSet(adSet.key, { ageMin: event.target.valueAsNumber || 18 })}
              />
              a
              <Input
                type="number"
                aria-label="Idade máxima"
                min={18}
                max={65}
                className="h-8 w-16 text-xs"
                disabled={disabled || special}
                value={special ? 65 : adSet.ageMax}
                onChange={(event) => setAdSet(adSet.key, { ageMax: event.target.valueAsNumber || 65 })}
              />
            </label>
            <div className="flex items-center gap-1">
              Países
              <CountryPicker selected={adSet.countries} disabled={disabled} onChange={(countries) => setAdSet(adSet.key, { countries })} />
            </div>
            <label className="flex items-center gap-2">
              <Checkbox
                checked={adSet.advantageAudience}
                disabled={disabled}
                onCheckedChange={(checked) => setAdSet(adSet.key, { advantageAudience: checked === true })}
              />
              Público Advantage+
              <MetricHelp term="ADVANTAGE" />
            </label>
            {!disabled && (
              <>
                <AudiencePicker
                  label="Incluir"
                  selected={adSet.includeAudienceIds}
                  audiences={audiences.filter((audience) => !special || !audience.isLookalike)}
                  onChange={(ids) => setAdSet(adSet.key, { includeAudienceIds: ids })}
                />
                <AudiencePicker
                  label="Excluir"
                  selected={adSet.excludeAudienceIds}
                  audiences={audiences.filter((audience) => !audience.isLookalike)}
                  onChange={(ids) => setAdSet(adSet.key, { excludeAudienceIds: ids })}
                />
              </>
            )}
          </div>

          <div className="space-y-3">
            {plan.creatives
              .filter((creative) => creative.adSetKey === adSet.key)
              .map((creative) => {
                const asset = assets.find((item) => item.id === creative.assetId);

                const missingAsset = !asset;

                return (
                  <div
                    key={creative.key}
                    className={cn(
                      "bg-muted/30 grid gap-2 rounded-md border p-2 md:grid-cols-[96px_1fr]",
                      missingAsset && "border-amber-500 dark:border-amber-600",
                    )}
                  >
                    <div className="space-y-1">
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setPickingAssetFor(creative.key)}
                        className={cn(
                          "bg-muted text-muted-foreground flex aspect-square w-24 items-center justify-center overflow-hidden rounded border text-[10px]",
                          missingAsset && "border-dashed border-amber-500 text-amber-700 dark:text-amber-400",
                        )}
                        aria-label={asset ? `Trocar o criativo (${asset.name})` : "Escolher imagem ou vídeo"}
                        title={asset?.name ?? "Escolher imagem ou vídeo"}
                      >
                        {asset?.previewUrl ? (
                          <img src={asset.previewUrl} alt={asset.name} className="h-full w-full object-cover" />
                        ) : asset ? (
                          <Film className="h-6 w-6" />
                        ) : (
                          "Escolher criativo"
                        )}
                      </button>
                      {missingAsset && (
                        <p className="flex w-24 items-start gap-1 text-[11px] text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="mt-px h-3 w-3 shrink-0" />
                          Sem imagem ou vídeo
                        </p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <div className="flex items-center gap-2">
                        <Input
                          aria-label="Nome do anúncio"
                          className="h-8"
                          maxLength={200}
                          disabled={disabled}
                          value={creative.name}
                          onChange={(event) => setCreative(creative.key, { name: event.target.value })}
                        />
                        {!disabled && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            aria-label={`Tirar ${creative.name}`}
                            onClick={() => removeCreative(creative)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <textarea
                        aria-label="Texto principal"
                        className={textarea}
                        placeholder="Texto principal"
                        maxLength={2000}
                        disabled={disabled}
                        value={creative.primaryText}
                        onChange={(event) => setCreative(creative.key, { primaryText: event.target.value })}
                      />
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          aria-label="Título"
                          placeholder="Título"
                          maxLength={255}
                          disabled={disabled}
                          value={creative.headline}
                          onChange={(event) => setCreative(creative.key, { headline: event.target.value })}
                        />
                        <Input
                          aria-label="Descrição"
                          placeholder="Descrição (opcional)"
                          maxLength={255}
                          disabled={disabled}
                          value={creative.description ?? ""}
                          onChange={(event) => setCreative(creative.key, { description: event.target.value || null })}
                        />
                      </div>
                      <Input
                        aria-label="Mensagem de boas-vindas"
                        placeholder="Mensagem que o cliente envia ao abrir o WhatsApp"
                        maxLength={500}
                        disabled={disabled}
                        value={creative.welcomeMessage}
                        onChange={(event) => setCreative(creative.key, { welcomeMessage: event.target.value })}
                      />
                      <label className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={creative.advantageEnhancements}
                          disabled={disabled}
                          onCheckedChange={(checked) => setCreative(creative.key, { advantageEnhancements: checked === true })}
                        />
                        Melhorias do Advantage+ criativo (retoques na imagem e variações de texto)
                        <MetricHelp term="ADVANTAGE" />
                      </label>
                    </div>
                  </div>
                );
              })}
            {!disabled && (
              <Button size="sm" variant="outline" onClick={() => addCreative(adSet.key)}>
                <Plus className="h-4 w-4" />
                Anúncio
              </Button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <Button size="sm" variant="outline" onClick={addAdSet}>
          <Plus className="h-4 w-4" />
          Conjunto
        </Button>
      )}

      <AssetPicker open={pickingAssetFor !== null} onOpenChange={(open) => !open && setPickingAssetFor(null)}>
        <AdsAssetLibrary
          account={account}
          assets={assets}
          selectedId={plan.creatives.find((creative) => creative.key === pickingAssetFor)?.assetId ?? null}
          onSelect={(selected) => {
            if (pickingAssetFor) setCreative(pickingAssetFor, { assetId: selected.id });
            setPickingAssetFor(null);
          }}
        />
      </AssetPicker>
    </div>
  );
};
