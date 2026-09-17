import { Badge } from "@/components/ui/badge";
import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { format } from "date-fns";
import { MemberRowActions } from "./components/memberRowActions";
import { memberStatusLabel, memberStatusVariant } from "./memberStatus";

export const getColumns = (clientId: string) => {
  const columns: DataTablePaginateColumnDef<Member>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => {
        const name: string | null = row.getValue("name");
        return name ?? <span className="text-muted-foreground italic">Convite pendente</span>;
      },
    },
    {
      accessorKey: "email",
      header: "E-mail",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status: MemberStatus = row.getValue("status");
        return <Badge variant={memberStatusVariant[status]}>{memberStatusLabel[status]}</Badge>;
      },
    },
    {
      accessorKey: "createdAt",
      header: "Data de entrada",
      cell: ({ row }) => format(row.getValue("createdAt"), "dd/MM/yyyy HH:mm"),
    },
    {
      header: "Ações",
      cell: ({ row }) => <MemberRowActions member={row.original} clientId={clientId} />,
    },
  ];

  return columns;
};
