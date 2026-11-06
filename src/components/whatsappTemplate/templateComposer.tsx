import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { templateService } from "@/services/api/templateService";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { TemplatePreview } from "./templatePreview";
import {
  headerFileAccept,
  headerFileLabel,
  headerFileType,
  templateCategoryLabel,
  templateStatusInfo,
  type TemplateDraft,
} from "./templateUtils";

type TemplateComposerProps = {
  clientId: string;
  configurationId: string;
  value: TemplateDraft;
  onChange: (draft: TemplateDraft) => void;
  disabled?: boolean;
};

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const optionLabel = (template: WhatsappTemplate) => {
  const parts = [`${template.name} (${template.language})`];
  if (template.category) parts.push(templateCategoryLabel[template.category] ?? template.category);
  if (!template.sendable) parts.push(templateStatusInfo(template).label);
  return parts.join(" · ");
};

/** Escolha do modelo do número, campos das variáveis, arquivo do cabeçalho e prévia. */
export const TemplateComposer: FC<TemplateComposerProps> = ({ clientId, configurationId, value, onChange, disabled }) => {
  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", clientId, configurationId],
    queryFn: () => templateService.findAll({ params: { clientId }, queries: { configurationId } }),
    enabled: !!configurationId,
  });

  const templates = templatesQuery.data ?? [];
  const template = value.template;
  const fileType = headerFileType(template);

  const selectTemplate = (templateId: string) =>
    onChange({ template: templates.find((item) => item.id === templateId) ?? null, variables: {}, headerFile: null });

  if (!configurationId) return <p className="text-muted-foreground text-sm">Escolha o número de envio para ver os modelos.</p>;
  if (templatesQuery.isLoading) return <LoadingState label="Carregando modelos..." />;
  if (templatesQuery.isError)
    return (
      <ErrorState
        message="Não foi possível buscar os modelos."
        onRetry={() => templatesQuery.refetch()}
        isRetrying={templatesQuery.isFetching}
      />
    );
  if (templates.length === 0)
    return (
      <EmptyState
        title="Nenhum modelo para este número"
        description="Sincronize os modelos da Meta em Configurações › WhatsApp › Templates."
      />
    );

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="template-composer-select">Modelo</Label>
        <select
          id="template-composer-select"
          className={selectClassName}
          value={template?.id ?? ""}
          disabled={disabled}
          onChange={(event) => selectTemplate(event.target.value)}
        >
          <option value="" disabled>
            Selecione
          </option>
          {templates.map((item) => (
            <option key={item.id} value={item.id}>
              {optionLabel(item)}
            </option>
          ))}
        </select>
        {template && !template.sendable && <p className="text-destructive text-sm">{template.unavailableReason}</p>}
      </div>

      {template?.sendable && (fileType || template.parameters.length > 0) && (
        <div className="grid gap-3">
          {fileType && (
            <div className="grid gap-2">
              <Label htmlFor="template-composer-file">{headerFileLabel[fileType]}</Label>
              <Input
                id="template-composer-file"
                type="file"
                accept={headerFileAccept[fileType]}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, headerFile: event.target.files?.[0] ?? null })}
              />
            </div>
          )}
          {template.parameters.map((parameter) => (
            <div key={parameter.key} className="grid gap-2">
              <Label htmlFor={`template-variable-${parameter.key}`}>{parameter.label}</Label>
              <Input
                id={`template-variable-${parameter.key}`}
                value={value.variables[parameter.key] ?? ""}
                placeholder={parameter.example ? `Ex.: ${parameter.example}` : undefined}
                disabled={disabled}
                onChange={(event) => onChange({ ...value, variables: { ...value.variables, [parameter.key]: event.target.value } })}
              />
            </div>
          ))}
        </div>
      )}

      {template && <TemplatePreview template={template} variables={value.variables} headerFileName={value.headerFile?.name} />}
    </div>
  );
};
