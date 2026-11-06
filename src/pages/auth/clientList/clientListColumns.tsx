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

        return (
          <span className="flex items-center gap-2">
            <Link to={`/dashboard/client/${clientId}`}>{name}</Link>
            {row.original.planExpired && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-950 dark:text-red-200">
                Plano vencido
              </span>
            )}
          </span>
        );
      },
    },
  ];

  return columns;
};
