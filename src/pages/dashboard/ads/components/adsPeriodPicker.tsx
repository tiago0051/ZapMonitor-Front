import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { addDaysToDate, dateInputClassName } from "../adsUtils";

const PRESETS = [7, 14, 30, 90] as const;

// Datas aaaa-mm-dd no fuso da conta de anúncio
export type AdsPeriod = { startDate: string; endDate: string };

type AdsPeriodPickerProps = {
  period: AdsPeriod;
  // Hoje no fuso da conta
  today: string;
  onChange: (period: AdsPeriod) => void;
};

/** Período único da aba Resultados: atalhos de dias e datas livres, sempre no fuso da conta. */
export const AdsPeriodPicker: FC<AdsPeriodPickerProps> = ({ period, today, onChange }) => {
  const { startDate, endDate } = period;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-md border p-0.5" role="group" aria-label="Período">
        {PRESETS.map((days) => {
          const presetStart = addDaysToDate(today, -(days - 1));
          const isActive = endDate === today && startDate === presetStart;
          return (
            <button
              key={days}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange({ startDate: presetStart, endDate: today })}
              className={cn(
                "focus-visible:ring-ring/50 rounded px-2.5 py-1.5 text-xs outline-none focus-visible:ring-[3px] sm:px-2 sm:py-1",
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {days} dias
            </button>
          );
        })}
      </div>
      <div className="grid w-full grid-cols-2 gap-1 sm:flex sm:w-auto sm:items-center">
        <Input
          type="date"
          aria-label="Início do período"
          value={startDate}
          max={endDate}
          onChange={(event) => event.target.value && onChange({ startDate: event.target.value, endDate })}
          className={dateInputClassName}
        />
        <Input
          type="date"
          aria-label="Fim do período"
          value={endDate}
          min={startDate}
          max={today}
          onChange={(event) => event.target.value && onChange({ startDate, endDate: event.target.value })}
          className={dateInputClassName}
        />
      </div>
    </div>
  );
};
