import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { FC } from "react";
import { DEFAULT_QUALIFICATION_MIN_SCORE, MAX_QUALIFICATION_CRITERIA, selectClassName } from "./offerUtils";

type Props = {
  criteria: OfferQualificationCriterion[];
  minScore: number | null;
  canManage: boolean;
  onChange: (changes: Pick<OfferData, "qualificationCriteria"> | Pick<OfferData, "qualificationMinScore">) => void;
};

const WEIGHTS = [1, 2, 3, 4, 5];

/**
 * O que descobrir na conversa para o lead contar como qualificado. O agente de IA pergunta com naturalidade, a análise do
 * negócio marca o que já foi atendido e o sistema faz a conta: obrigatórios atendidos e peso na nota mínima.
 */
export const OfferQualificationEditor: FC<Props> = ({ criteria, minScore, canManage, onChange }) => {
  const setCriterion = (index: number, changes: Partial<OfferQualificationCriterion>) =>
    onChange({ qualificationCriteria: criteria.map((item, i) => (i === index ? { ...item, ...changes } : item)) });

  return (
    <section className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">Qualificação do lead</h3>
          <p className="text-muted-foreground text-xs">
            O que descobrir na conversa para saber se vale seguir com o lead. O agente de IA pergunta, a análise do negócio marca o que já
            foi atendido e só move para a etapa de qualificado quando a conta fecha.
          </p>
        </div>
        {canManage && criteria.length < MAX_QUALIFICATION_CRITERIA && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange({ qualificationCriteria: [...criteria, { label: "", question: null, weight: 1, required: false }] })}
          >
            <Plus className="h-4 w-4" />
            Critério
          </Button>
        )}
      </div>

      {criteria.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Nenhum ainda. Exemplos: "Tem mais de 2 atendentes", "Quer começar este mês", "Quem decide participa da conversa". A IA sugere
          critérios quando preenche a oferta a partir de um material.
        </p>
      ) : (
        <>
          <ol className="grid gap-2">
            {criteria.map((item, index) => (
              <li key={item.id ?? `new-${index}`} className="grid gap-2 rounded-md border p-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <Input
                    id={`offer-criterion-${index}`}
                    aria-label={`Critério ${index + 1}: o que descobrir`}
                    maxLength={300}
                    placeholder="Tem mais de 2 atendentes"
                    value={item.label}
                    onChange={(event) => setCriterion(index, { label: event.target.value })}
                  />
                  <Input
                    id={`offer-criterion-question-${index}`}
                    aria-label={`Critério ${index + 1}: como perguntar`}
                    maxLength={500}
                    placeholder="Como perguntar: quantas pessoas atendem hoje?"
                    value={item.question ?? ""}
                    onChange={(event) => setCriterion(index, { question: event.target.value || null })}
                  />
                  {canManage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remover critério ${index + 1}`}
                      onClick={() => onChange({ qualificationCriteria: criteria.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    Peso
                    <select
                      aria-label={`Peso do critério ${index + 1}`}
                      className={`${selectClassName} w-16`}
                      value={item.weight}
                      onChange={(event) => setCriterion(index, { weight: Number(event.target.value) })}
                    >
                      {WEIGHTS.map((weight) => (
                        <option key={weight} value={weight}>
                          {weight}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={item.required}
                      onChange={(event) => setCriterion(index, { required: event.target.checked })}
                    />
                    Obrigatório (sem ele não há venda)
                  </label>
                </div>
              </li>
            ))}
          </ol>

          <div className="grid max-w-xs gap-1">
            <Label htmlFor="offer-qualification-min">Nota mínima para qualificar (%)</Label>
            <Input
              id="offer-qualification-min"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              placeholder={String(DEFAULT_QUALIFICATION_MIN_SCORE)}
              value={minScore ?? ""}
              onChange={(event) => {
                const value = event.target.value === "" ? null : Math.round(Number(event.target.value));
                onChange({ qualificationMinScore: value === null || Number.isNaN(value) ? null : Math.min(100, Math.max(0, value)) });
              }}
            />
            <p className="text-muted-foreground text-xs">
              Parte do peso dos critérios que precisa estar atendida, além de todos os obrigatórios. Vazio usa{" "}
              {DEFAULT_QUALIFICATION_MIN_SCORE}%.
            </p>
          </div>
        </>
      )}
    </section>
  );
};
