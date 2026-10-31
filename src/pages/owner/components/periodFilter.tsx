import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { periodPresets, type Period } from "../ownerFormat";
import type { FC } from "react";

type PeriodFilterProps = {
  period: Period;
  onChange: (period: Period) => void;
};

export const PeriodFilter: FC<PeriodFilterProps> = ({ period, onChange }) => (
  <div className="flex flex-wrap items-end gap-3">
    <div className="space-y-1">
      <Label htmlFor="period-start">De</Label>
      <Input
        id="period-start"
        type="date"
        value={period.start}
        max={period.end}
        onChange={(e) => onChange({ ...period, start: e.target.value })}
      />
    </div>
    <div className="space-y-1">
      <Label htmlFor="period-end">Até</Label>
      <Input
        id="period-end"
        type="date"
        value={period.end}
        min={period.start}
        onChange={(e) => onChange({ ...period, end: e.target.value })}
      />
    </div>
    <div className="flex flex-wrap gap-2">
      {periodPresets.map((preset) => (
        <Button key={preset.label} variant="outline" size="sm" onClick={() => onChange(preset.build())}>
          {preset.label}
        </Button>
      ))}
    </div>
  </div>
);
