import { Input } from "@/components/ui/input";
import { DialogFilterCategory } from "../components/dialogSelectCategory/dialogFilterCategory";
import { globalContants } from "@/contants/globalContants";
import { useDebounceValue } from "usehooks-ts";
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { KanbanColumn } from "./components/kanbanColumn";
import { KanbanCard } from "./components/kanbanCard";

export const WhatsappKanban = () => {
  const [filterCategories, setFilterCategories] = useState<
    WhatsappMessageCategory[]
  >([]);
  const [filterText, setFilterText] = useDebounceValue(
    "",
    globalContants.DEBOUNCE_DELAY
  );

  return (
    <div className="grid grid-rows-[min-content_1fr] h-[calc(100dvh-16px)] gap-5">
      <div className="space-y-2 pr-4">
        <h2 className="mb-2">Filtros</h2>
        <div className="grid grid-cols-4 gap-4">
          <DialogFilterCategory
            categories={filterCategories}
            onSelectCategories={setFilterCategories}
          />
          <div className="grid gap-2">
            <Label>Buscar contatos</Label>
            <Input
              placeholder="Nome ou número de telefone"
              onChange={(e) => setFilterText(e.currentTarget.value)}
            />
          </div>
        </div>
      </div>

      <div className="border-collapse flex gap-1">
        <KanbanColumn title="Aguardando">
          <KanbanCard />
        </KanbanColumn>
        <KanbanColumn title="Em atendimento">
          <KanbanCard />
        </KanbanColumn>
        <KanbanColumn title="Meus atendimentos">
          <KanbanCard />
        </KanbanColumn>
        <KanbanColumn title="Finalizados">
          <KanbanCard />
        </KanbanColumn>
      </div>
    </div>
  );
};
