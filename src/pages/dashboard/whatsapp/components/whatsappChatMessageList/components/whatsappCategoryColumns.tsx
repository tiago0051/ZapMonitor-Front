import { Checkbox } from "@/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";

type getColumnsProps = {
  onSelectCategory: (categoryId: string) => void;
  categoryIdsSelected?: string[];
};

export const getColumns = ({
  onSelectCategory,
  categoryIdsSelected,
}: getColumnsProps) => {
  const columns: ColumnDef<WhatsappMessageCategory>[] = [
    {
      header: "Ações",
      cell: ({ row }) => {
        const id: string = row.getValue("id");

        const selected = categoryIdsSelected?.includes(id);

        return (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelectCategory(id)}
          />
        );
      },
    },
    {
      accessorKey: "name",
      header: "Nome",
    },
  ];

  return columns;
};
