import { DisabledReason } from "@/components/disabled-reason";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { describeSendWindow } from "@/pages/dashboard/broadcasts/broadcastUtils";
import { AlertTriangle } from "lucide-react";
import type { FC, ReactNode } from "react";
import { Link } from "react-router";
import { formatCount, formatMoney } from "../adsUtils";
import { MetricHelp } from "../components/metricHelp";
import { SCHEDULE_MIN_DAYS } from "./publishChecklistUtils";

type OptionCardProps = {
  value: AdOptimizationEvent;
  checked: boolean;
  disabled: boolean;
  title: string;
  description: string;
  recommended: boolean;
  onSelect: (value: AdOptimizationEvent) => void;
};

const OptionCard: FC<OptionCardProps> = ({ value, checked, disabled, title, description, recommended, onSelect }) => (
  <label
    className={cn(
      "has-focus-visible:ring-ring/50 flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-focus-visible:ring-[3px]",
      checked && "border-primary bg-primary/5",
      disabled && "cursor-not-allowed opacity-60",
    )}
  >
    <input
      type="radio"
      name="plan-optimization"
      className="accent-primary mt-0.5"
      value={value}
      checked={checked}
      disabled={disabled}
      onChange={() => onSelect(value)}
    />
    <span className="min-w-0 space-y-0.5">
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
        {title}
        {recommended && <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold">Recomendado</span>}
      </span>
      <span className="text-muted-foreground block text-xs">{description}</span>
    </span>
  </label>
);

type DeliveryFieldsProps = {
  plan: AdCampaignPlan;
  durationDays: number | null;
  currency: string;
  options: AdDeliveryOptions | undefined;
  disabled: boolean;
  onChange: (changes: Partial<AdCampaignPlan>) => void;
  onDurationChange: (durationDays: number | null) => void;
};

/** Entrega da campanha: o que a Meta otimiza (conversas ou vendas do CRM) e se os anúncios rodam só no horário da equipe. */
export const DeliveryFields: FC<DeliveryFieldsProps> = ({
  plan,
  durationDays,
  currency,
  options,
  disabled,
  onChange,
  onDurationChange,
}) => {
  const baseUrl = useBaseUrl();
  // Rascunho antigo, sem os campos: conversas e horário livre
  const event = plan.optimizationEvent ?? "CONVERSATIONS";
  const teamHoursOnly = plan.teamHoursOnly ?? false;
  const purchases = options?.readiness.purchases ?? 0;
  const minPurchases = options?.minWeeklyPurchases ?? 50;
  const conversionsOff = !!options && !options.conversionsEnabled;
  const hasDuration = !!durationDays && durationDays >= SCHEDULE_MIN_DAYS;
  const noTeamHours = !!options && !options.teamHours;

  let purchaseNotice: ReactNode = null;
  if (conversionsOff)
    purchaseNotice = (
      <DisabledReason>
        Para otimizar por vendas, ligue o envio de eventos para a Meta em{" "}
        <Link className="underline underline-offset-2" to={`${baseUrl}/configuration?tab=metaAds`}>
          Configurações → Anúncios da Meta
        </Link>
        .
      </DisabledReason>
    );
  else if (options && event === "PURCHASE" && purchases < minPurchases)
    purchaseNotice = (
      <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
        Com menos de {minPurchases} vendas por semana a Meta pode demorar para aprender e o custo pode subir no começo. Se preferir, comece
        por conversas e troque quando as vendas aumentarem.
      </p>
    );

  return (
    <div className="space-y-4 rounded-lg border p-3">
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          Otimizar por
          <MetricHelp term="OPTIMIZATION" />
        </p>
        <div role="radiogroup" aria-label="Otimizar por" className="grid gap-2 sm:grid-cols-2">
          <OptionCard
            value="CONVERSATIONS"
            checked={event === "CONVERSATIONS"}
            disabled={disabled}
            title="Conversas no WhatsApp"
            description="Padrão. A Meta procura quem tende a chamar no WhatsApp."
            recommended={options?.suggestedOptimizationEvent === "CONVERSATIONS"}
            onSelect={(value) => onChange({ optimizationEvent: value })}
          />
          <OptionCard
            value="PURCHASE"
            checked={event === "PURCHASE"}
            disabled={disabled || (conversionsOff && event !== "PURCHASE")}
            title="Vendas registradas no CRM"
            description="A Meta procura quem tende a comprar, usando as vendas marcadas como ganhas no CRM."
            recommended={options?.suggestedOptimizationEvent === "PURCHASE"}
            onSelect={(value) => onChange({ optimizationEvent: value })}
          />
        </div>
        {options && (
          <p className="text-muted-foreground text-xs">
            Nos últimos 7 dias a Meta recebeu {formatCount(purchases)} {purchases === 1 ? "venda" : "vendas"} do CRM (o ideal é{" "}
            {minPurchases} por semana).
          </p>
        )}
        {purchaseNotice}
        <p className="text-muted-foreground text-xs">A otimização não pode ser trocada depois que a campanha é criada na Meta.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Switch
            id="plan-team-hours"
            className="mt-0.5"
            checked={teamHoursOnly}
            disabled={disabled || (noTeamHours && !teamHoursOnly)}
            onCheckedChange={(checked) => onChange({ teamHoursOnly: checked })}
          />
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor="plan-team-hours" className="flex items-center gap-1.5 text-sm">
              Mostrar os anúncios só no horário da equipe
              <MetricHelp term="TEAM_HOURS" />
            </Label>
            {options?.teamHours && <p className="text-muted-foreground text-xs">{describeSendWindow(options.teamHours)}</p>}
          </div>
        </div>
        {noTeamHours && (
          <DisabledReason>
            Defina o horário e os dias da equipe em{" "}
            <Link className="underline underline-offset-2" to={`${baseUrl}/ads?tab=automation`}>
              Configurar → Automação
            </Link>
            , na parte do atendimento.
          </DisabledReason>
        )}
        {teamHoursOnly && (
          <div className="space-y-2 pl-11">
            {!hasDuration && (
              <DisabledReason>
                A Meta só deixa escolher horários com verba total e data de fim. Informe um prazo de pelo menos {SCHEDULE_MIN_DAYS} dias.
              </DisabledReason>
            )}
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label htmlFor="plan-duration" className="text-xs">
                  Prazo em dias
                </Label>
                <Input
                  id="plan-duration"
                  type="number"
                  min={SCHEDULE_MIN_DAYS}
                  max={365}
                  className="h-8 w-24"
                  disabled={disabled}
                  value={durationDays ?? ""}
                  onChange={(event) => onDurationChange(Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber)}
                />
              </div>
              {hasDuration && (
                <p className="pb-1.5 text-sm">
                  <span className="font-medium">Verba total: {formatMoney(plan.dailyBudget * durationDays, currency)}</span>{" "}
                  <span className="text-muted-foreground text-xs">
                    ({formatMoney(plan.dailyBudget, currency)} por dia × {durationDays} dias)
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
