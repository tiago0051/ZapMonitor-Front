import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidPeriod, periodPresets, type Period } from "./period";

export const PeriodFilter = ({ period, onChange, idPrefix }: { period: Period; onChange: (period: Period) => void; idPrefix: string }) => {
  const activePreset = periodPresets.find((preset) => {
    const built = preset.build();
    return built.start === period.start && built.end === period.end;
  });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-start`}>De</Label>
          <Input
            id={`${idPrefix}-start`}
            type="date"
            value={period.start}
            max={period.end}
            onChange={(e) => onChange({ ...period, start: e.target.value })}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-end`}>Até</Label>
          <Input
            id={`${idPrefix}-end`}
            type="date"
            value={period.end}
            min={period.start}
            onChange={(e) => onChange({ ...period, end: e.target.value })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {periodPresets.map((preset) => (
            <Button
              key={preset.label}
              variant={activePreset?.label === preset.label ? "secondary" : "outline"}
              size="sm"
              aria-pressed={activePreset?.label === preset.label}
              onClick={() => onChange(preset.build())}
            >
              {preset.label}
            </Button>
          ))}
        </div>
      </div>
      {!isValidPeriod(period) && <p className="text-destructive text-sm">Escolha um período em que o início seja antes do fim.</p>}
    </div>
  );
};
