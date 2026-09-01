import { type DataTableColumnDef } from "@/components/ui/dataTableFeatures";
import { Link } from "react-router";

export const getColumns = () => {
  const columns: DataTableColumnDef<Client>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => {
        const name = row.renderValue<string>("name");
        const clientId = row.original.id;

        return <Link to={`/dashboard/client/${clientId}`}>{name}</Link>;
      },
    },
  ];

  return columns;
};
