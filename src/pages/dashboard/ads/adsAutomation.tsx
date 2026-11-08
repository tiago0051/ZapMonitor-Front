import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Pencil, Play, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { AdsAttendance } from "./adsAttendance";
import { formatMoney, ruleActionLabel, ruleMetricLabel, targetLevelLabel } from "./adsUtils";

const selectClassName = cn(crmSelectClassName, "h-8 text-xs");
const PERIODS = [1, 3, 7, 14, 30];
const MONEY_METRICS: AdRuleMetric[] = ["SPEND", "COST_PER_CONVERSATION", "COST_PER_DEAL", "COST_PER_WON_DEAL"];

const newRule = (): AdRuleValues => ({
  name: "",
  active: true,
  level: "ad",
  metric: "COST_PER_DEAL",
  operator: "GREATER_THAN",
  threshold: 0,
  periodDays: 7,
  minSpend: 0,
  action: "PAUSE",
  actionValue: null,
  requiresApproval: true,
});

/** Travas que valem para toda mudança: horário, fim de semana, aumento de orçamento e aplicação sem aprovação. */
const GuardrailsForm: FC<{ guardrails: AdGuardrails }> = ({ guardrails }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [values, setValues] = useState(guardrails);
  const canEdit = can("ads.approve");

  const save = useMutation({
    mutationFn: metaAdsService.saveGuardrails,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "guardrails"] });
      toast.success("Travas salvas");
    },
  });

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">Travas de segurança</h3>
      </div>
      <p className="text-muted-foreground text-xs">
        Valem para toda mudança aprovada ou feita por regra. Nada é excluído: para parar algo, a mudança pausa. Desfazer não passa pelas
        travas.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1">
          <Label htmlFor="guardrail-budget" className="text-xs">
            Aumento máximo de orçamento em 24h (%)
          </Label>
          <Input
            id="guardrail-budget"
            type="number"
            min={0}
            max={200}
            disabled={!canEdit}
            value={values.maxBudgetIncreasePercent}
            onChange={(event) => setValues({ ...values, maxBudgetIncreasePercent: event.target.valueAsNumber || 0 })}
          />
        </div>
        <div className="grid gap-1">
          <span className="text-xs font-medium">Horário permitido (fuso da conta)</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              aria-label="Hora inicial"
              min={0}
              max={23}
              disabled={!canEdit}
              value={values.allowedStartHour}
              onChange={(event) => setValues({ ...values, allowedStartHour: event.target.valueAsNumber || 0 })}
              className="w-20"
            />
            <span className="text-xs">até</span>
            <Input
              type="number"
              aria-label="Hora final"
              min={1}
              max={24}
              disabled={!canEdit}
              value={values.allowedEndHour}
              onChange={(event) => setValues({ ...values, allowedEndHour: event.target.valueAsNumber || 0 })}
              className="w-20"
            />
          </div>
        </div>
        <div className="grid content-end gap-2">
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={values.allowWeekends}
              disabled={!canEdit}
              onCheckedChange={(checked) => setValues({ ...values, allowWeekends: checked === true })}
            />
            Permitir no fim de semana
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Checkbox
              checked={values.allowAutoApply}
              disabled={!canEdit}
              onCheckedChange={(checked) => setValues({ ...values, allowAutoApply: checked === true })}
            />
            Regras podem aplicar sem aprovação
          </label>
        </div>
      </div>
      {canEdit && (
        <Button
          size="sm"
          disabled={save.isPending || values.allowedStartHour >= values.allowedEndHour}
          onClick={() => save.mutate({ params: { clientId: client.id }, body: values })}
        >
          Salvar travas
        </Button>
      )}
    </div>
  );
};

type RuleFormProps = { account: AdAccount; rule?: AdRule; onDone: () => void };

const RuleForm: FC<RuleFormProps> = ({ account, rule, onDone }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<AdRuleValues>(() => (rule ? { ...rule } : newRule()));
  const isBudget = values.action !== "PAUSE";
  const isValid = values.name.trim() !== "" && (!isBudget || (values.actionValue ?? 0) >= 1) && !(isBudget && values.level === "ad");

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["metaAds", "rules"] });
    toast.success("Regra salva");
    onDone();
  };
  const create = useMutation({ mutationFn: metaAdsService.createRule, onError: requestErrorHandling, onSuccess });
  const update = useMutation({ mutationFn: metaAdsService.updateRule, onError: requestErrorHandling, onSuccess });

  const submit = () => {
    if (!isValid) return;
    const body = { ...values, actionValue: isBudget ? values.actionValue : null };
    if (rule) update.mutate({ params: { clientId: client.id, ruleId: rule.id }, body });
    else create.mutate({ params: { clientId: client.id, accountId: account.id }, body });
  };

  return (
    <div className="space-y-3 rounded-lg border border-dashed p-3">
      <Input
        aria-label="Nome da regra"
        placeholder="Nome da regra"
        maxLength={200}
        value={values.name}
        onChange={(event) => setValues({ ...values, name: event.target.value })}
      />
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span>Se</span>
        <select
          aria-label="Nível"
          className={selectClassName}
          value={values.level}
          onChange={(event) => setValues({ ...values, level: event.target.value as AdRuleValues["level"] })}
        >
          <option value="campaign">a campanha</option>
          <option value="adset">o conjunto</option>
          <option value="ad">o anúncio</option>
        </select>
        <span>tiver</span>
        <select
          aria-label="Métrica"
          className={selectClassName}
          value={values.metric}
          onChange={(event) => setValues({ ...values, metric: event.target.value as AdRuleMetric })}
        >
          {(Object.keys(ruleMetricLabel) as AdRuleMetric[]).map((metric) => (
            <option key={metric} value={metric}>
              {ruleMetricLabel[metric].toLowerCase()}
            </option>
          ))}
        </select>
        <select
          aria-label="Comparação"
          className={selectClassName}
          value={values.operator}
          onChange={(event) => setValues({ ...values, operator: event.target.value as AdRuleOperator })}
        >
          <option value="GREATER_THAN">acima de</option>
          <option value="LESS_THAN">abaixo de</option>
        </select>
        <Input
          type="number"
          aria-label="Limite"
          min={0}
          step="0.01"
          className="h-8 w-24 text-xs"
          value={values.threshold}
          onChange={(event) => setValues({ ...values, threshold: event.target.valueAsNumber || 0 })}
        />
        <span>nos últimos</span>
        <select
          aria-label="Período"
          className={selectClassName}
          value={values.periodDays}
          onChange={(event) => setValues({ ...values, periodDays: Number(event.target.value) })}
        >
          {PERIODS.map((days) => (
            <option key={days} value={days}>
              {days} {days === 1 ? "dia" : "dias"}
            </option>
          ))}
        </select>
        <span>, então</span>
        <select
          aria-label="Ação"
          className={selectClassName}
          value={values.action}
          onChange={(event) => setValues({ ...values, action: event.target.value as AdRuleAction })}
        >
          {(Object.keys(ruleActionLabel) as AdRuleAction[]).map((action) => (
            <option key={action} value={action}>
              {ruleActionLabel[action].toLowerCase()}
            </option>
          ))}
        </select>
        {isBudget && (
          <>
            <span>em</span>
            <Input
              type="number"
              aria-label="Percentual"
              min={1}
              max={50}
              className="h-8 w-16 text-xs"
              value={values.actionValue ?? ""}
              onChange={(event) =>
                setValues({ ...values, actionValue: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })
              }
            />
            <span>%</span>
          </>
        )}
      </div>
      {isBudget && values.level === "ad" && (
        <p className="text-destructive text-xs">Anúncio não tem orçamento; use campanha ou conjunto.</p>
      )}
      {MONEY_METRICS.includes(values.metric) && (
        <p className="text-muted-foreground text-xs">
          Valores na moeda da conta ({account.currency}). Gasto sem nenhum resultado conta como custo acima de qualquer limite.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <label className="flex items-center gap-2">
          Só avaliar com gasto de pelo menos
          <Input
            type="number"
            min={0}
            step="0.01"
            className="h-8 w-24 text-xs"
            value={values.minSpend}
            onChange={(event) => setValues({ ...values, minSpend: event.target.valueAsNumber || 0 })}
          />
        </label>
        <label className="flex items-center gap-2">
          <Checkbox
            checked={!values.requiresApproval}
            disabled={!can("ads.approve")}
            onCheckedChange={(checked) => setValues({ ...values, requiresApproval: checked !== true })}
          />
          Aplicar sem aprovação (se as travas permitirem)
        </label>
        <label className="flex items-center gap-2">
          <Checkbox checked={values.active} onCheckedChange={(checked) => setValues({ ...values, active: checked === true })} />
          Ativa
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!isValid || create.isPending || update.isPending} onClick={submit}>
          Salvar regra
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};

const describeRule = (rule: AdRule, currency: string) => {
  const threshold = MONEY_METRICS.includes(rule.metric) ? formatMoney(rule.threshold, currency) : rule.threshold.toLocaleString("pt-BR");
  const action = rule.action === "PAUSE" ? "pausar" : `${ruleActionLabel[rule.action].toLowerCase()} em ${rule.actionValue}%`;

  return `Se ${targetLevelLabel[rule.level].toLowerCase()} tiver ${ruleMetricLabel[rule.metric].toLowerCase()} ${
    rule.operator === "GREATER_THAN" ? "acima de" : "abaixo de"
  } ${threshold} nos últimos ${rule.periodDays} dia(s), ${action}.`;
};

/** Travas do cliente e regras automáticas da conta, avaliadas todo dia às 9h. */
export const AdsAutomation: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [editingRuleId, setEditingRuleId] = useState<string | "new" | null>(null);

  const guardrailsQuery = useQuery({
    queryKey: ["metaAds", "guardrails", client.id],
    queryFn: () => metaAdsService.findGuardrails({ params: { clientId: client.id } }),
  });
  const rulesQuery = useQuery({
    queryKey: ["metaAds", "rules", client.id, account.id],
    queryFn: () => metaAdsService.findRules({ params: { clientId: client.id, accountId: account.id } }),
  });

  const deleteRule = useMutation({
    mutationFn: metaAdsService.deleteRule,
    onError: requestErrorHandling,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metaAds", "rules"] }),
  });
  const runRule = useMutation({
    mutationFn: metaAdsService.runRule,
    onError: requestErrorHandling,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      toast.success(result.changes ? `${result.changes} mudança(s) criada(s); veja em Mudanças` : "Nenhum item passou do limite");
    },
  });

  if (guardrailsQuery.isLoading || rulesQuery.isLoading) return <LoadingState />;

  return (
    <section className="space-y-4">
      {guardrailsQuery.data && <GuardrailsForm key={JSON.stringify(guardrailsQuery.data)} guardrails={guardrailsQuery.data} />}
      <AdsAttendance />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Regras automáticas</h3>
          <span className="text-muted-foreground text-xs">avaliadas todo dia às 9h com os dias completos até ontem</span>
          {can("ads.manage") && editingRuleId === null && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => setEditingRuleId("new")}>
              <Plus className="h-4 w-4" />
              Nova regra
            </Button>
          )}
        </div>

        {editingRuleId === "new" && <RuleForm account={account} onDone={() => setEditingRuleId(null)} />}
        {rulesQuery.data?.length === 0 && editingRuleId !== "new" && (
          <p className="text-muted-foreground text-sm">
            Nenhuma regra. Exemplo: se o anúncio tiver custo por negócio acima de R$ 200 nos últimos 7 dias, pausar.
          </p>
        )}

        {rulesQuery.data?.map((rule) =>
          editingRuleId === rule.id ? (
            <RuleForm key={rule.id} account={account} rule={rule} onDone={() => setEditingRuleId(null)} />
          ) : (
            <div key={rule.id} className={cn("flex flex-wrap items-start gap-2 rounded-lg border p-3", !rule.active && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {rule.name}
                  {!rule.active && <span className="text-muted-foreground"> (inativa)</span>}
                </p>
                <p className="text-muted-foreground text-xs">{describeRule(rule, account.currency)}</p>
                <p className="text-muted-foreground text-xs">
                  {rule.requiresApproval ? "Espera aprovação" : "Aplica sem aprovação quando as travas permitem"}
                  {rule.minSpend > 0 && ` · só com gasto a partir de ${formatMoney(rule.minSpend, account.currency)}`}
                  {rule.lastRunAt && ` · última avaliação ${format(new Date(rule.lastRunAt), "dd/MM HH:mm")}`}
                </p>
              </div>
              {can("ads.manage") && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Avaliar ${rule.name} agora`}
                    title="Avaliar agora"
                    disabled={runRule.isPending}
                    onClick={() => runRule.mutate({ params: { clientId: client.id, ruleId: rule.id } })}
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Editar ${rule.name}`}
                    onClick={() => setEditingRuleId(rule.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Apagar ${rule.name}`}
                    disabled={deleteRule.isPending}
                    onClick={() => deleteRule.mutate({ params: { clientId: client.id, ruleId: rule.id } })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ),
        )}
      </div>
    </section>
  );
};
