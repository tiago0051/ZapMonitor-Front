import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";

export const getColumns = () => {
  const columns: ColumnDef<Client>[] = [
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
