import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WeeklyHoursEditor } from "@/components/weeklyHoursEditor";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
import { useState, type FC } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm";

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (SP, RJ, MG, Sul, Nordeste...)" },
  { value: "America/Manaus", label: "Amazonas" },
  { value: "America/Cuiaba", label: "Mato Grosso" },
  { value: "America/Belem", label: "Pará" },
  { value: "America/Fortaleza", label: "Ceará" },
  { value: "America/Recife", label: "Pernambuco" },
  { value: "America/Rio_Branco", label: "Acre" },
  { value: "America/Noronha", label: "Fernando de Noronha" },
];

// Feriados nacionais fixos, para adicionar com um clique
const NATIONAL_HOLIDAYS: CompanyHoliday[] = [
  { date: "2000-01-01", description: "Confraternização Universal", recurring: true },
  { date: "2000-04-21", description: "Tiradentes", recurring: true },
  { date: "2000-05-01", description: "Dia do Trabalho", recurring: true },
  { date: "2000-09-07", description: "Independência do Brasil", recurring: true },
  { date: "2000-10-12", description: "Nossa Senhora Aparecida", recurring: true },
  { date: "2000-11-02", description: "Finados", recurring: true },
  { date: "2000-11-15", description: "Proclamação da República", recurring: true },
  { date: "2000-11-20", description: "Consciência Negra", recurring: true },
  { date: "2000-12-25", description: "Natal", recurring: true },
];

type FormState = Pick<CompanyHours, "timezone" | "intervals" | "holidays">;

/** Horário de funcionamento da empresa e feriados, usado pelos nós "Horário de atendimento" dos fluxos. */
export const CompanyHoursSettings = () => {
  const { clientId } = useParams();

  const companyHoursQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["companyHours", clientId],
    queryFn: () => flowService.findCompanyHours(clientId!),
  });

  if (companyHoursQuery.isLoading) return <LoadingState label="Carregando o horário da empresa..." />;
  if (!companyHoursQuery.data)
    return (
      <ErrorState
        message="Não foi possível carregar o horário da empresa."
        onRetry={() => companyHoursQuery.refetch()}
        isRetrying={companyHoursQuery.isFetching}
      />
    );

  // A key recria o formulário quando o servidor devolve o horário salvo
  return <CompanyHoursForm key={companyHoursQuery.data.updatedAt ?? "new"} clientId={clientId!} companyHours={companyHoursQuery.data} />;
};

const CompanyHoursForm: FC<{ clientId: string; companyHours: CompanyHours }> = ({ clientId, companyHours }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>({
    timezone: companyHours.timezone,
    intervals: companyHours.intervals,
    holidays: companyHours.holidays,
  });
  const [isDirty, setIsDirty] = useState(false);
  const { guardDialog } = useUnsavedChangesGuard(isDirty);

  const change = (changes: Partial<FormState>) => {
    setForm((current) => ({ ...current, ...changes }));
    setIsDirty(true);
  };

  const save = useMutation({
    mutationFn: flowService.saveCompanyHours,
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      setIsDirty(false);
      queryClient.setQueryData(["companyHours", clientId], saved);
      // Pendências dos fluxos que usam o horário da empresa podem ter mudado
      queryClient.invalidateQueries({ queryKey: ["flows", clientId] });
      queryClient.invalidateQueries({ queryKey: ["flow", clientId] });
      toast.success("Horário da empresa salvo");
    },
  });

  const invalidInterval = form.intervals.some((interval) => !interval.start || !interval.end || interval.start >= interval.end);
  const invalidHoliday = form.holidays.some((holiday) => !holiday.date);

  const updateHoliday = (index: number, changes: Partial<CompanyHoliday>) =>
    change({ holidays: form.holidays.map((holiday, holidayIndex) => (holidayIndex === index ? { ...holiday, ...changes } : holiday)) });

  const addNationalHolidays = () => {
    const existing = new Set(form.holidays.filter((holiday) => holiday.recurring).map((holiday) => holiday.date.slice(5)));
    const missing = NATIONAL_HOLIDAYS.filter((holiday) => !existing.has(holiday.date.slice(5)));
    if (missing.length === 0) return toast.info("Os feriados nacionais já estão na lista");
    change({ holidays: [...form.holidays, ...missing] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horário da empresa</CardTitle>
        <CardDescription>
          Quando a empresa atende. Os nós "Horário de atendimento" dos fluxos que usam o horário da empresa seguem por "Dentro do horário"
          ou "Fora do horário" conforme este cadastro. Feriados e datas fechadas contam como fora do horário o dia inteiro.
        </CardDescription>
        {!companyHours.configured && (
          <p className="rounded-md bg-amber-50 p-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Ainda não salvo. Confira o horário abaixo e salve para os fluxos poderem usar.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-sm space-y-1.5">
          <Label htmlFor="company-hours-timezone">Fuso horário</Label>
          <select
            id="company-hours-timezone"
            className={selectClassName}
            value={form.timezone}
            onChange={(e) => change({ timezone: e.target.value })}
          >
            {TIMEZONES.map((timezone) => (
              <option key={timezone.value} value={timezone.value}>
                {timezone.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Dias e horários</Label>
          <p className="text-muted-foreground text-xs">O horário final não está incluso (08:00 até 18:00 atende até 17:59).</p>
          <WeeklyHoursEditor value={form.intervals} onChange={(intervals) => change({ intervals })} />
          {invalidInterval && <p className="text-destructive text-sm">Em cada intervalo o início precisa ser antes do fim.</p>}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Feriados e datas fechadas</Label>
            <Button type="button" variant="outline" size="sm" onClick={addNationalHolidays}>
              Adicionar feriados nacionais
            </Button>
          </div>
          {form.holidays.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma data cadastrada.</p>}
          <ul className="space-y-2">
            {form.holidays.map((holiday, index) => (
              <li key={index} className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center">
                <Input
                  type="date"
                  aria-label="Data"
                  value={holiday.date}
                  onChange={(e) => updateHoliday(index, { date: e.target.value })}
                  className="sm:w-40"
                />
                <Input
                  aria-label="Descrição"
                  placeholder="Ex.: Aniversário da cidade"
                  maxLength={100}
                  value={holiday.description}
                  onChange={(e) => updateHoliday(index, { description: e.target.value })}
                  className="flex-1"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <Checkbox
                      checked={!!holiday.recurring}
                      onCheckedChange={(checked) => updateHoliday(index, { recurring: checked === true })}
                    />
                    Todo ano
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Remover data"
                    onClick={() => change({ holidays: form.holidays.filter((_, holidayIndex) => holidayIndex !== index) })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => change({ holidays: [...form.holidays, { date: "", description: "", recurring: false }] })}
          >
            <Plus className="h-4 w-4" />
            Adicionar data
          </Button>
          {invalidHoliday && <p className="text-destructive text-sm">Preencha a data de cada feriado ou remova a linha.</p>}
        </div>

        <div className="flex justify-end">
          <Button
            disabled={save.isPending || invalidInterval || invalidHoliday || (!isDirty && companyHours.configured)}
            onClick={() => save.mutate({ params: { clientId }, body: form })}
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar horário
          </Button>
        </div>
      </CardContent>
      {guardDialog}
    </Card>
  );
};
