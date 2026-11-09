import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import type { FC } from "react";

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
// Segunda primeiro, como a semana de trabalho
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

type WeeklyHoursEditorProps = {
  value: WeeklyInterval[];
  onChange: (value: WeeklyInterval[]) => void;
  disabled?: boolean;
};

/** Horários de atendimento por dia da semana, com mais de um intervalo no mesmo dia (ex.: 08–12 e 13–18). */
export const WeeklyHoursEditor: FC<WeeklyHoursEditorProps> = ({ value, onChange, disabled }) => {
  const intervalsOf = (weekday: number) => value.filter((interval) => interval.weekday === weekday);

  const setDay = (weekday: number, intervals: WeeklyInterval[]) =>
    onChange(
      [...value.filter((interval) => interval.weekday !== weekday), ...intervals].sort(
        (a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start),
      ),
    );

  const addInterval = (weekday: number) => {
    const intervals = intervalsOf(weekday);
    const last = intervals.at(-1);
    // Um novo intervalo começa uma hora depois do fim do anterior
    const start = last ? addHour(last.end) : "08:00";
    setDay(weekday, [...intervals, { weekday, start, end: last ? addHour(start, 4) : "12:00" }]);
  };

  return (
    <div className="space-y-2">
      {WEEKDAY_ORDER.map((weekday) => {
        const intervals = intervalsOf(weekday);

        return (
          <div key={weekday} className="flex flex-col gap-2 sm:flex-row sm:items-start">
            <label className="flex h-9 w-28 shrink-0 items-center gap-2 text-sm">
              <Checkbox
                checked={intervals.length > 0}
                disabled={disabled}
                onCheckedChange={(checked) => (checked === true ? addInterval(weekday) : setDay(weekday, []))}
              />
              {WEEKDAY_LABELS[weekday]}
            </label>

            <div className="flex flex-1 flex-col gap-2">
              {intervals.length === 0 && <p className="text-muted-foreground flex h-9 items-center text-sm">Sem atendimento</p>}

              {intervals.map((interval, index) => {
                const update = (changes: Partial<WeeklyInterval>) =>
                  setDay(
                    weekday,
                    intervals.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
                  );

                return (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[weekday]}: início`}
                      disabled={disabled}
                      value={interval.start}
                      onChange={(event) => update({ start: event.target.value })}
                    />
                    <span className="text-muted-foreground text-sm">até</span>
                    <Input
                      type="time"
                      aria-label={`${WEEKDAY_LABELS[weekday]}: fim`}
                      disabled={disabled}
                      value={interval.end}
                      onChange={(event) => update({ end: event.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      aria-label="Remover intervalo"
                      disabled={disabled}
                      onClick={() =>
                        setDay(
                          weekday,
                          intervals.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    {index === intervals.length - 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Adicionar intervalo no dia"
                        disabled={disabled}
                        onClick={() => addInterval(weekday)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function addHour(time: string, hours = 1) {
  const [hour, minute] = time.split(":").map(Number);
  const total = Math.min(23 * 60 + 59, hour * 60 + minute + hours * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
