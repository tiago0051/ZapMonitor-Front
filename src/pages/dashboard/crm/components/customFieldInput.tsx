import { Input } from "@/components/ui/input";
import type { FC } from "react";
import { crmSelectClassName } from "../crmUtils";

type CustomFieldInputProps = {
  id: string;
  field: CrmField;
  // Texto como digitado; número e data seguem o formato do campo nativo
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export const CustomFieldInput: FC<CustomFieldInputProps> = ({ id, field, value, onChange, disabled }) => {
  if (field.type === "SELECT")
    return (
      <select id={id} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className={crmSelectClassName}>
        <option value="">Não informado</option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );

  return (
    <Input
      id={id}
      type={field.type === "DATE" ? "date" : field.type === "NUMBER" ? "number" : "text"}
      step={field.type === "NUMBER" ? "any" : undefined}
      maxLength={field.type === "TEXT" ? 500 : undefined}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
};
