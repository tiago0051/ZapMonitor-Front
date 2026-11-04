import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldSelectClassName } from "./campaignUtils";
import type { FC } from "react";
import type { useCampaignOptions } from "./useCampaignOptions";


type Options = ReturnType<typeof useCampaignOptions>;

type RoutingFieldsProps = {
  routing: AdDraftRouting;
  options: Options;
  disabled: boolean;
  onChange: (routing: AdDraftRouting) => void;
};

/** Número e página do clique para WhatsApp, e o fluxo, o funil e o grupo da conversa que chegar. */
export const RoutingFields: FC<RoutingFieldsProps> = ({ routing, options, disabled, onChange }) => {
  const pipeline = options.pipelines.find((item) => item.id === routing.pipelineId);
  const set = (changes: Partial<AdDraftRouting>) => onChange({ ...routing, ...changes });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="grid gap-1">
        <Label htmlFor="draft-number" className="text-xs">
          Número de WhatsApp
        </Label>
        <select
          id="draft-number"
          className={fieldSelectClassName}
          disabled={disabled}
          value={routing.whatsappConfigurationId ?? ""}
          onChange={(event) => set({ whatsappConfigurationId: event.target.value || null })}
        >
          <option value="">Escolha</option>
          {options.configurations.map((configuration) => (
            <option key={configuration.id} value={configuration.id}>
              {configuration.phoneNumber}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="draft-page" className="text-xs">
          Página do Facebook ligada ao número
        </Label>
        <select
          id="draft-page"
          className={fieldSelectClassName}
          disabled={disabled}
          value={routing.metaPageId ?? ""}
          onChange={(event) => set({ metaPageId: event.target.value || null })}
        >
          <option value="">Escolha</option>
          {options.pages.map((page) => (
            <option key={page.metaPageId} value={page.metaPageId}>
              {page.name}
            </option>
          ))}
        </select>
        {options.pagesError && (
          <p className="text-destructive text-[11px]">Não foi possível listar as páginas; reconecte a Meta autorizando as páginas.</p>
        )}
      </div>
      <div className="grid gap-1">
        <Label htmlFor="draft-flow" className="text-xs">
          Fluxo da conversa
        </Label>
        <select
          id="draft-flow"
          className={fieldSelectClassName}
          disabled={disabled}
          value={routing.flowId ?? ""}
          onChange={(event) => set({ flowId: event.target.value || null })}
        >
          <option value="">O fluxo do número</option>
          {options.flows.map((flow) => (
            <option key={flow.id} value={flow.id}>
              {flow.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="draft-pipeline" className="text-xs">
          Funil do negócio
        </Label>
        <select
          id="draft-pipeline"
          className={fieldSelectClassName}
          disabled={disabled}
          value={routing.pipelineId ?? ""}
          onChange={(event) => set({ pipelineId: event.target.value || null, stageId: null })}
        >
          <option value="">Não criar negócio</option>
          {options.pipelines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="draft-stage" className="text-xs">
          Etapa
        </Label>
        <select
          id="draft-stage"
          className={fieldSelectClassName}
          disabled={disabled || !pipeline}
          value={routing.stageId ?? ""}
          onChange={(event) => set({ stageId: event.target.value || null })}
        >
          <option value="">Primeira etapa</option>
          {pipeline?.stages
            .filter((stage) => stage.type === "OPEN")
            .map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="draft-group" className="text-xs">
          Grupo de atendimento
        </Label>
        <select
          id="draft-group"
          className={fieldSelectClassName}
          disabled={disabled || !pipeline}
          value={routing.serviceGroupId ?? ""}
          onChange={(event) => set({ serviceGroupId: event.target.value || null })}
        >
          <option value="">O grupo do contato</option>
          {options.serviceGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

type BriefFieldsProps = { brief: AdCampaignBrief; currency: string; disabled: boolean; onChange: (brief: AdCampaignBrief) => void };

/** O pedido que a IA usa para montar o plano. */
export const BriefFields: FC<BriefFieldsProps> = ({ brief, currency, disabled, onChange }) => {
  const set = (changes: Partial<AdCampaignBrief>) => onChange({ ...brief, ...changes });
  const textarea = "border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm";

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor="brief-goal" className="text-xs">
          Objetivo
        </Label>
        <textarea
          id="brief-goal"
          className={textarea}
          maxLength={1000}
          disabled={disabled}
          placeholder="Ex.: trazer conversas de aposentados do INSS interessados em consignado"
          value={brief.goal}
          onChange={(event) => set({ goal: event.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="brief-product" className="text-xs">
          Produto ou serviço
        </Label>
        <Input
          id="brief-product"
          maxLength={500}
          disabled={disabled}
          value={brief.product}
          onChange={(event) => set({ product: event.target.value })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="brief-offer" className="text-xs">
          Oferta
        </Label>
        <Input
          id="brief-offer"
          maxLength={500}
          disabled={disabled}
          placeholder="Ex.: primeira parcela só em 90 dias"
          value={brief.offer ?? ""}
          onChange={(event) => set({ offer: event.target.value || null })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="brief-audience" className="text-xs">
          Para quem
        </Label>
        <Input
          id="brief-audience"
          maxLength={1000}
          disabled={disabled}
          value={brief.audienceDescription ?? ""}
          onChange={(event) => set({ audienceDescription: event.target.value || null })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="brief-region" className="text-xs">
          Região
        </Label>
        <Input
          id="brief-region"
          maxLength={300}
          disabled={disabled}
          placeholder="Brasil"
          value={brief.region ?? ""}
          onChange={(event) => set({ region: event.target.value || null })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="brief-budget" className="text-xs">
          Verba diária ({currency})
        </Label>
        <Input
          id="brief-budget"
          type="number"
          min={1}
          step="0.01"
          disabled={disabled}
          value={brief.dailyBudget || ""}
          onChange={(event) => set({ dailyBudget: event.target.valueAsNumber || 0 })}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="brief-duration" className="text-xs">
          Prazo em dias (opcional)
        </Label>
        <Input
          id="brief-duration"
          type="number"
          min={1}
          max={365}
          disabled={disabled}
          value={brief.durationDays ?? ""}
          onChange={(event) => set({ durationDays: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })}
        />
      </div>
      <div className="grid gap-1 sm:col-span-2">
        <Label htmlFor="brief-notes" className="text-xs">
          Observações
        </Label>
        <textarea
          id="brief-notes"
          className={textarea}
          maxLength={2000}
          disabled={disabled}
          placeholder="Tom de voz, o que não dizer, diferenciais…"
          value={brief.notes ?? ""}
          onChange={(event) => set({ notes: event.target.value || null })}
        />
      </div>
    </div>
  );
};
