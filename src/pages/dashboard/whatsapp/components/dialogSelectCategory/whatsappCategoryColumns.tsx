import { Checkbox } from "@/components/ui/checkbox";
import { type ColumnDef } from "@tanstack/react-table";

type getColumnsProps = {
  onSelectCategory: (category: WhatsappMessageCategory) => void;
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
        const selected = categoryIdsSelected?.includes(row.original.id);

        return (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onSelectCategory(row.original)}
          />
        );
      },
    },
    {
      accessorKey: "name",
      header: "Nome",
    }
  ];

  return columns;
};
