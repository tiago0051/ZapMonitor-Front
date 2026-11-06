import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FC } from "react";
import { sourceFromKey, sourceKey, type VariableMapping } from "../broadcastUtils";
import { selectClassName } from "../audienceSources";

type VariablesStepProps = {
  parameters: WhatsappTemplateParameter[];
  mapping: Record<string, VariableMapping>;
  onChange: (mapping: Record<string, VariableMapping>) => void;
  csvHeaders: string[];
  crmFields: CrmField[];
  hasCrmRows: boolean;
};

export const VariablesStep: FC<VariablesStepProps> = ({ parameters, mapping, onChange, csvHeaders, crmFields, hasCrmRows }) => {
  if (!parameters.length) return <p className="text-muted-foreground text-sm">Este modelo não tem variáveis. Siga para a revisão.</p>;

  const update = (key: string, value: VariableMapping) => onChange({ ...mapping, [key]: value });

  return (
    <div className="grid gap-5">
      <p className="text-muted-foreground text-sm">
        Escolha de onde vem cada variável. O valor reserva entra quando o campo da pessoa está vazio; sem ele, a pessoa fica fora da
        campanha.
      </p>
      {parameters.map((parameter) => {
        const item = mapping[parameter.key] ?? { source: { kind: "fixed", value: "" }, fallback: "" };
        const key = sourceKey(item.source);
        const isFixed = item.source.kind === "fixed";

        return (
          <div key={parameter.key} className="grid gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">
              {parameter.label}
              {parameter.example && <span className="text-muted-foreground font-normal"> · ex.: {parameter.example}</span>}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor={`variable-source-${parameter.key}`} className="text-xs">
                  Origem
                </Label>
                <select
                  id={`variable-source-${parameter.key}`}
                  className={selectClassName}
                  value={key}
                  onChange={(event) => update(parameter.key, { ...item, source: sourceFromKey(event.target.value) })}
                >
                  <option value="fixed">Texto fixo</option>
                  <option value="firstName">Primeiro nome do contato</option>
                  <option value="name">Nome completo do contato</option>
                  <option value="surname">Apelido do contato</option>
                  {hasCrmRows && <option value="dealTitle">Título do negócio</option>}
                  {hasCrmRows &&
                    crmFields
                      .filter((field) => field.active)
                      .map((field) => (
                        <option key={field.id} value={`crmField:${field.id}`}>
                          Campo do CRM: {field.name}
                        </option>
                      ))}
                  {csvHeaders.map((header) => (
                    <option key={header} value={`column:${header}`}>
                      Coluna da planilha: {header}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor={`variable-value-${parameter.key}`} className="text-xs">
                  {isFixed ? "Texto" : "Valor reserva"}
                </Label>
                <Input
                  id={`variable-value-${parameter.key}`}
                  value={isFixed && item.source.kind === "fixed" ? item.source.value : item.fallback}
                  placeholder={isFixed ? (parameter.example ?? "") : "Ex.: cliente"}
                  onChange={(event) =>
                    update(
                      parameter.key,
                      isFixed
                        ? { ...item, source: { kind: "fixed", value: event.target.value } }
                        : { ...item, fallback: event.target.value },
                    )
                  }
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
