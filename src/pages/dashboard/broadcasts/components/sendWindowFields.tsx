import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { defaultSendWindow, minutesToTime, sendWindowError, timeToMinutes, WEEKDAYS } from "../broadcastUtils";

type SendWindowFieldsProps = {
  value: BroadcastSendWindow | null;
  onChange: (value: BroadcastSendWindow | null) => void;
  idPrefix: string;
  disabled?: boolean;
};

/** Liga a janela de envio e escolhe horário e dias; fora dela a campanha espera e continua sozinha. */
export const SendWindowFields: FC<SendWindowFieldsProps> = ({ value, onChange, idPrefix, disabled }) => {
  const error = sendWindowError(value);

  return (
    <div className="grid gap-3">
      <label className="flex items-start gap-2 text-sm">
        <Checkbox
          id={`${idPrefix}-enabled`}
          checked={!!value}
          disabled={disabled}
          onCheckedChange={(checked) => onChange(checked === true ? defaultSendWindow : null)}
        />
        <span>
          Só enviar em um horário
          <span className="text-muted-foreground block text-xs">
            Fora dele a campanha espera e continua sozinha no próximo horário permitido. Horário de Brasília.
          </span>
        </span>
      </label>

      {value && (
        <div className="grid gap-3 pl-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-start`} className="text-xs">
                De
              </Label>
              <Input
                id={`${idPrefix}-start`}
                type="time"
                className="w-32"
                disabled={disabled}
                value={minutesToTime(value.startMinute)}
                onChange={(event) => onChange({ ...value, startMinute: timeToMinutes(event.target.value) })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${idPrefix}-end`} className="text-xs">
                Até
              </Label>
              <Input
                id={`${idPrefix}-end`}
                type="time"
                className="w-32"
                disabled={disabled}
                value={minutesToTime(value.endMinute)}
                onChange={(event) => onChange({ ...value, endMinute: timeToMinutes(event.target.value) })}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Dias da semana">
            {WEEKDAYS.map((label, day) => {
              const active = value.days.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  disabled={disabled}
                  aria-pressed={active}
                  onClick={() =>
                    onChange({
                      ...value,
                      days: active ? value.days.filter((item) => item !== day) : [...value.days, day].sort((a, b) => a - b),
                    })
                  }
                  className={cn(
                    "focus-visible:ring-ring rounded-md border px-2.5 py-1 text-xs outline-none focus-visible:ring-2",
                    active ? "border-primary bg-primary/10 font-medium" : "text-muted-foreground",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
};
