import { type DataTablePaginateColumnDef } from "@/components/ui/dataTablePaginateFeatures";
import { formatShortId } from "@/utils/formatString";
import { format } from "date-fns";
import parsePhoneNumber from "libphonenumber-js";
import { DialogEditWhatsappConfiguration } from "./components/dialogEditWhatsappConfiguration";

export const getColumns = () => {
  const columns: DataTablePaginateColumnDef<WhatsappConfiguration>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => {
        const id: string = row.getValue("id");
        return formatShortId(id);
      },
    },
    {
      accessorKey: "phoneNumber",
      header: "Telefone",
      cell: ({ row }) => {
        const phoneNumber: string = row.getValue("phoneNumber");
        const phoneNumberFormatted = parsePhoneNumber(phoneNumber);

        return phoneNumberFormatted?.format("INTERNATIONAL");
      },
    },
    {
      accessorKey: "createdAt",
      header: "Data de criação",
      cell: ({ row }) => {
        const sendAt: Date = row.getValue("createdAt");
        return format(sendAt, "dd/MM/yyyy HH:mm");
      },
    },
    {
      header: "Ações",
      cell: ({ row }) => {
        return (
          <div>
            <DialogEditWhatsappConfiguration
              whatsappConfiguration={row.original}
            />
          </div>
        );
      },
    },
  ];

  return columns;
};
