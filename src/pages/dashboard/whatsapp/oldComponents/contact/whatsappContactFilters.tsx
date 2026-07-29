import { Input } from "@/components/ui/input";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import type { FC } from "react";

type WhatsappContactFiltersProps = {
  filterCategories: WhatsappMessageCategory[];
  onChangeFilterCategories: (value: WhatsappMessageCategory[]) => void;
  onChangeFilterText: (value: string) => void;
};

export const WhatsappContactFilters: FC<WhatsappContactFiltersProps> = ({
  filterCategories,
  onChangeFilterCategories,
  onChangeFilterText,
}) => {
  return (
    <div className="space-y-4">
      <h2 className="mb-2">Filtros</h2>
      <div className="grid grid-cols-4 gap-2">
        <DialogFilterCategory categories={filterCategories} onSelectCategories={onChangeFilterCategories} />
        <Input placeholder="Buscar contatos" onChange={(e) => onChangeFilterText(e.currentTarget.value)} />
      </div>
    </div>
  );
};
