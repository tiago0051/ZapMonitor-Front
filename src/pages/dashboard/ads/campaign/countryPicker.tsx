import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, X } from "lucide-react";
import { useMemo, useState, type FC } from "react";

// Américas, Europa e os principais dos outros continentes (códigos ISO 3166-1 que a Meta usa)
const COUNTRY_CODES = [
  // Américas
  "BR",
  "AR",
  "BO",
  "CL",
  "CO",
  "EC",
  "GY",
  "PY",
  "PE",
  "SR",
  "UY",
  "VE",
  "MX",
  "US",
  "CA",
  "CR",
  "CU",
  "DO",
  "SV",
  "GT",
  "HN",
  "HT",
  "JM",
  "NI",
  "PA",
  "PR",
  "TT",
  "BS",
  "BB",
  "BZ",
  // Europa
  "PT",
  "ES",
  "FR",
  "IT",
  "DE",
  "GB",
  "IE",
  "NL",
  "BE",
  "LU",
  "CH",
  "AT",
  "DK",
  "SE",
  "NO",
  "FI",
  "IS",
  "PL",
  "CZ",
  "SK",
  "HU",
  "RO",
  "BG",
  "GR",
  "HR",
  "SI",
  "RS",
  "BA",
  "AL",
  "MK",
  "ME",
  "MT",
  "CY",
  "EE",
  "LV",
  "LT",
  "UA",
  "MD",
  // África
  "AO",
  "MZ",
  "CV",
  "GW",
  "ST",
  "ZA",
  "NG",
  "EG",
  "MA",
  "KE",
  "GH",
  "SN",
  "TN",
  "DZ",
  // Ásia e Oceania
  "JP",
  "CN",
  "KR",
  "IN",
  "ID",
  "PH",
  "TH",
  "VN",
  "MY",
  "SG",
  "TL",
  "IL",
  "AE",
  "SA",
  "QA",
  "TR",
  "AU",
  "NZ",
];

let displayNames: Intl.DisplayNames | null = null;
try {
  displayNames = new Intl.DisplayNames(["pt-BR"], { type: "region" });
} catch {
  displayNames = null;
}

const countryName = (code: string) => displayNames?.of(code) ?? code;

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const COUNTRIES = COUNTRY_CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) =>
  // Brasil primeiro; o resto em ordem alfabética
  a.code === "BR" ? -1 : b.code === "BR" ? 1 : a.name.localeCompare(b.name, "pt-BR"),
);

type CountryPickerProps = { selected: string[]; disabled?: boolean; onChange: (codes: string[]) => void };

/** Escolha de países pelo nome; guarda os códigos ISO que a Meta espera. */
export const CountryPicker: FC<CountryPickerProps> = ({ selected, disabled, onChange }) => {
  const [search, setSearch] = useState("");
  const query = normalize(search.trim());
  // Códigos que vieram do plano (ex.: da IA) e não estão na lista continuam aparecendo
  const options = useMemo(() => {
    const extra = selected.filter((code) => !COUNTRY_CODES.includes(code)).map((code) => ({ code, name: countryName(code) }));
    return [...extra, ...COUNTRIES];
  }, [selected]);
  const filtered = query
    ? options.filter((country) => normalize(country.name).includes(query) || country.code.toLowerCase() === query)
    : options;
  const toggle = (code: string, checked: boolean) => onChange(checked ? [...selected, code] : selected.filter((item) => item !== code));

  const summary =
    selected.length === 0
      ? "Escolha os países"
      : selected.length <= 2
        ? selected.map(countryName).join(", ")
        : `${countryName(selected[0])} e mais ${selected.length - 1}`;

  return (
    <Popover onOpenChange={(open) => !open && setSearch("")}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label={`Países: ${selected.length ? selected.map(countryName).join(", ") : "nenhum"}`}
          className={`h-8 max-w-56 justify-between gap-1 text-xs font-normal ${selected.length === 0 ? "border-amber-500 text-amber-700 dark:text-amber-400" : ""}`}
        >
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2 p-2">
        <Input
          autoFocus
          aria-label="Buscar país"
          placeholder="Buscar país…"
          className="h-8 text-sm"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selected.map((code) => (
              <span key={code} className="bg-muted flex items-center gap-1 rounded px-1.5 py-0.5 text-xs">
                {countryName(code)}
                <button type="button" aria-label={`Tirar ${countryName(code)}`} onClick={() => toggle(code, false)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="max-h-60 space-y-0.5 overflow-y-auto" role="group" aria-label="Países">
          {filtered.length === 0 && <p className="text-muted-foreground px-1 py-2 text-xs">Nenhum país encontrado.</p>}
          {filtered.map((country) => (
            <label key={country.code} className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm">
              <Checkbox checked={selected.includes(country.code)} onCheckedChange={(checked) => toggle(country.code, checked === true)} />
              <span className="truncate">{country.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
