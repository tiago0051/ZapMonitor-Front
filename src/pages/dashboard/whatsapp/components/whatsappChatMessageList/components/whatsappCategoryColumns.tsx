import { Checkbox } from "@/components/ui/checkbox";
import { formatShortId } from "@/utils/formatString";
import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

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
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => {
        const id: string = row.getValue("id");
        return formatShortId(id);
      },
    },
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "createdAt",
      header: "Data de criação",
      cell: ({ row }) => {
        const sendAt: Date = row.getValue("createdAt");
        return format(sendAt, "dd/MM/yyyy HH:mm");
      },
    },
  ];

  return columns;
};
