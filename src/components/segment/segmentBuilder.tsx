import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { contactService } from "@/services/api/contactService";
import { crmService } from "@/services/api/crmService";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import type { FC } from "react";
import {
  crmConditionTypes,
  dealStatusLabel,
  newSegmentCondition,
  segmentConditionError,
  segmentConditionLabel,
  segmentOriginLabel,
} from "./segmentUtils";

export const segmentSelectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

type SegmentData = {
  categories: WhatsappMessageCategory[];
  pipelines: Pipeline[];
  contactFields: CrmField[];
  dealFields: CrmField[];
};

const toggle = <T,>(list: T[], item: T, checked: boolean) => (checked ? [...list, item] : list.filter((value) => value !== item));

const CheckList = <T extends string>({
  options,
  selected,
  onChange,
}: {
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (value: T[]) => void;
}) => (
  <div className="flex flex-wrap gap-x-4 gap-y-2">
    {options.map((option) => (
      <label key={option.value} className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={selected.includes(option.value)}
          onCheckedChange={(checked) => onChange(toggle(selected, option.value, checked === true))}
        />
        {option.label}
      </label>
    ))}
  </div>
);

const ConditionEditor: FC<{ condition: SegmentCondition; onChange: (value: SegmentCondition) => void; data: SegmentData; id: string }> = ({
  condition,
  onChange,
  data,
  id,
}) => {
  switch (condition.type) {
    case "TAG":
      return data.categories.length ? (
        <CheckList
          options={data.categories.map((category) => ({ value: category.id, label: category.name }))}
          selected={condition.categoryIds}
          onChange={(categoryIds) => onChange({ ...condition, categoryIds })}
        />
      ) : (
        <p className="text-muted-foreground text-sm">Nenhuma etiqueta cadastrada.</p>
      );
    case "DEAL": {
      const pipeline = data.pipelines.find((item) => item.id === condition.pipelineId);
      return (
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-pipeline`} className="text-xs">
              Funil
            </Label>
            <select
              id={`${id}-pipeline`}
              className={segmentSelectClassName}
              value={condition.pipelineId ?? ""}
              onChange={(event) => onChange({ ...condition, pipelineId: event.target.value || null, stageIds: [] })}
            >
              <option value="">Qualquer funil</option>
              {data.pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {pipeline && (
            <div className="grid gap-1.5">
              <p className="text-xs font-medium">Etapas (nenhuma marcada vale todas)</p>
              <CheckList
                options={pipeline.stages.map((stage) => ({ value: stage.id, label: stage.name }))}
                selected={condition.stageIds}
                onChange={(stageIds) => onChange({ ...condition, stageIds })}
              />
            </div>
          )}
          <div className="grid gap-1.5">
            <p className="text-xs font-medium">Situação do negócio</p>
            <CheckList
              options={(["OPEN", "WON", "LOST"] as SegmentDealStatus[]).map((value) => ({ value, label: dealStatusLabel[value] }))}
              selected={condition.statuses}
              onChange={(statuses) => onChange({ ...condition, statuses })}
            />
          </div>
        </div>
      );
    }
    case "ORIGIN":
      return (
        <CheckList
          options={(Object.keys(segmentOriginLabel) as SegmentOrigin[]).map((value) => ({ value, label: segmentOriginLabel[value] }))}
          selected={condition.origins}
          onChange={(origins) => onChange({ ...condition, origins })}
        />
      );
    case "FIELD":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-field`} className="text-xs">
              Campo
            </Label>
            <select
              id={`${id}-field`}
              className={segmentSelectClassName}
              value={condition.fieldId ? `${condition.scope}:${condition.fieldId}` : ""}
              onChange={(event) => {
                const [scope, fieldId] = event.target.value.split(":");
                onChange({ ...condition, scope: scope === "DEAL" ? "DEAL" : "CONTACT", fieldId: fieldId ?? "" });
              }}
            >
              <option value="">Selecione</option>
              {data.contactFields.map((field) => (
                <option key={field.id} value={`CONTACT:${field.id}`}>
                  Ficha: {field.name}
                </option>
              ))}
              {data.dealFields.map((field) => (
                <option key={field.id} value={`DEAL:${field.id}`}>
                  Negócio: {field.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${id}-operator`} className="text-xs">
              Condição
            </Label>
            <select
              id={`${id}-operator`}
              className={segmentSelectClassName}
              value={condition.operator}
              onChange={(event) => onChange({ ...condition, operator: event.target.value === "FILLED" ? "FILLED" : "EQUALS" })}
            >
              <option value="EQUALS">É igual a</option>
              <option value="FILLED">Está preenchido</option>
            </select>
          </div>
          {condition.operator === "EQUALS" && (
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-value`} className="text-xs">
                Valor
              </Label>
              <Input
                id={`${id}-value`}
                value={condition.value ?? ""}
                maxLength={191}
                onChange={(event) => onChange({ ...condition, value: event.target.value })}
              />
            </div>
          )}
        </div>
      );
    case "CREATED": {
      const byDays = condition.withinDays !== null;
      return (
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name={`${id}-mode`}
                checked={byDays}
                onChange={() => onChange({ ...condition, withinDays: 30, from: null, to: null })}
              />
              Nos últimos dias
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name={`${id}-mode`} checked={!byDays} onChange={() => onChange({ ...condition, withinDays: null })} />
              Entre datas
            </label>
          </div>
          {byDays ? (
            <div className="flex items-center gap-2 text-sm">
              <Input
                aria-label="Dias"
                type="number"
                min={1}
                max={3650}
                className="w-24"
                value={condition.withinDays ?? ""}
                onChange={(event) => onChange({ ...condition, withinDays: Number(event.target.value) || null })}
              />
              dias
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-from`} className="text-xs">
                  De
                </Label>
                <Input
                  id={`${id}-from`}
                  type="date"
                  value={condition.from ?? ""}
                  onChange={(event) => onChange({ ...condition, from: event.target.value || null })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`${id}-to`} className="text-xs">
                  Até
                </Label>
                <Input
                  id={`${id}-to`}
                  type="date"
                  value={condition.to ?? ""}
                  onChange={(event) => onChange({ ...condition, to: event.target.value || null })}
                />
              </div>
            </div>
          )}
        </div>
      );
    }
    case "CONSENT":
      return (
        <select
          aria-label="Canal"
          className={segmentSelectClassName}
          value={condition.channel}
          onChange={(event) => onChange({ ...condition, channel: event.target.value === "EMAIL" ? "EMAIL" : "WHATSAPP" })}
        >
          <option value="WHATSAPP">Aceita marketing no WhatsApp (não se descadastrou)</option>
          <option value="EMAIL">Aceita e-mails de marketing (e-mail válido e não descadastrado)</option>
        </select>
      );
  }
};

const ConditionList: FC<{
  list: SegmentCondition[];
  onChange: (list: SegmentCondition[]) => void;
  data: SegmentData;
  idPrefix: string;
  addLabel: string;
  types: SegmentConditionType[];
}> = ({ list, onChange, data, idPrefix, addLabel, types }) => (
  <div className="grid gap-2">
    {list.map((condition, index) => {
      const error = segmentConditionError(condition);
      return (
        <div key={index} className="grid gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">{segmentConditionLabel[condition.type]}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Tirar regra"
              onClick={() => onChange(list.filter((_, position) => position !== index))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ConditionEditor
            id={`${idPrefix}-${index}`}
            condition={condition}
            data={data}
            onChange={(value) => onChange(list.map((item, position) => (position === index ? value : item)))}
          />
          {error && <p className="text-xs text-amber-700 dark:text-amber-400">{error}</p>}
        </div>
      );
    })}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="justify-self-start">
          <Plus className="mr-1 h-4 w-4" />
          {addLabel}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {types.map((type) => (
          <DropdownMenuItem key={type} onSelect={() => onChange([...list, newSegmentCondition(type)])}>
            {segmentConditionLabel[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
);

type SegmentBuilderProps = { value: SegmentRules; onChange: (value: SegmentRules) => void; idPrefix?: string };

/** Regras de incluir e excluir pessoas: etiquetas, negócio, origem, campos, data de cadastro e consentimento. */
export const SegmentBuilder: FC<SegmentBuilderProps> = ({ value, onChange, idPrefix = "segment" }) => {
  const { client, canUseCrm } = useClientContext();

  const categoriesQuery = useQuery({
    queryKey: ["whatsappCategories", client.id, "broadcast"],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({ params: { clientId: client.id }, queries: { page: 1, take: 200, text: "" } }),
  });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const dealFieldsQuery = useQuery({
    queryKey: ["crm", "fields", client.id],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const contactFieldsQuery = useQuery({
    queryKey: ["contacts", "fields", client.id],
    queryFn: () => contactService.findFields(client.id),
  });

  const data: SegmentData = {
    categories: categoriesQuery.data?.items ?? [],
    pipelines: (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active),
    contactFields: (contactFieldsQuery.data ?? []).filter((field) => field.active),
    dealFields: (dealFieldsQuery.data ?? []).filter((field) => field.active && field.scope !== "CONTACT"),
  };
  const types = (Object.keys(segmentConditionLabel) as SegmentConditionType[]).filter(
    (type) => canUseCrm || !crmConditionTypes.includes(type),
  );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Entram as pessoas que atendem a</span>
          <select
            aria-label="Como juntar as regras"
            className={`${segmentSelectClassName} w-auto`}
            value={value.match}
            onChange={(event) => onChange({ ...value, match: event.target.value === "ANY" ? "ANY" : "ALL" })}
          >
            <option value="ALL">todas as regras</option>
            <option value="ANY">qualquer uma das regras</option>
          </select>
        </div>
        <ConditionList
          list={value.include}
          onChange={(include) => onChange({ ...value, include })}
          data={data}
          idPrefix={`${idPrefix}-include`}
          addLabel="Adicionar regra"
          types={types}
        />
      </div>
      <div className="grid gap-2">
        <p className="text-sm">Ficam de fora as pessoas que atendem a qualquer uma destas:</p>
        <ConditionList
          list={value.exclude}
          onChange={(exclude) => onChange({ ...value, exclude })}
          data={data}
          idPrefix={`${idPrefix}-exclude`}
          addLabel="Excluir por"
          types={types}
        />
      </div>
    </div>
  );
};
