import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { UserActions } from "./components/userActions";
import { UserMemberships } from "./components/userMemberships";

export const getColumns = () => {
  const columns: DataTablePaginateColumnDef<ImplanterUser>[] = [
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "email",
      header: "E-mail",
    },
    {
      header: "Tenants",
      cell: ({ row }) => <UserMemberships memberships={row.original.memberships} />,
    },
    {
      header: "Ações",
      cell: ({ row }) => <UserActions user={row.original} />,
    },
  ];

  return columns;
};
