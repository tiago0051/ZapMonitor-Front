import { Button } from "@/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Edit, RefreshCcw } from "lucide-react";
import { Link } from "react-router";

type getColumnsProps = {
  generateNewSecret: (clientId: string) => void;
};

export const getColumns = ({ generateNewSecret }: getColumnsProps) => {
  const columns: ColumnDef<Client>[] = [
    {
      accessorKey: "id",
      header: "Client Id",
    },
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "createdAt",
      header: "Data de criação",
      cell: ({ row }) => {
        const createdAt: Date = row.getValue("createdAt");
        return format(createdAt, "dd/MM/yyyy");
      },
    },
    {
      accessorKey: "id",
      header: "Ações",
      cell: (a) => {
        const clientId = a.renderValue<string>();
        return (
          <>
            <Button
              variant={"ghost"}
              onClick={() => generateNewSecret(clientId)}
            >
              <RefreshCcw />
            </Button>
            <Link to={`/dashboard/client/${clientId}`}>
              <Button variant={"ghost"}>
                <Edit />
              </Button>
            </Link>
          </>
        );
      },
    },
  ];

  return columns;
};
