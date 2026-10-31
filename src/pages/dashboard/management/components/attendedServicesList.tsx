import { Badge } from "@/components/ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { managementService } from "@/services/api/managementService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FC } from "react";
import { getContactName, getContactPhone, serviceStatusLabel } from "../managementFormat";

const PAGE_SIZE = 20;

type AttendedServicesListProps = {
  attendant: ManagementAttendantSummary;
  period: ManagementPeriodQuery;
};

const formatDateTime = (date: string | null) => (date ? format(new Date(date), "dd/MM/yyyy HH:mm") : "—");

export const AttendedServicesList: FC<AttendedServicesListProps> = ({ attendant, period }) => {
  const { client } = useClientContext();
  const [page, setPage] = useState(1);

  const findServicesQuery = useQuery({
    queryKey: ["management", "attendedServices", client.id, attendant.userId, period, page],
    queryFn: () =>
      managementService.findAttendedServices({
        params: { clientId: client.id, userId: attendant.userId },
        queries: { ...period, page, take: PAGE_SIZE },
      }),
  });

  const services = findServicesQuery.data;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <p className="truncate text-sm font-semibold">Atendidos por {attendant.name}</p>
        <Badge>{attendant.total}</Badge>
      </div>

      {findServicesQuery.isLoading && (
        <div className="space-y-2 p-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      )}
      {findServicesQuery.isError && <p className="text-destructive p-4 text-sm">Erro ao buscar os atendimentos.</p>}
      {services && services.items.length === 0 && <p className="text-muted-foreground p-4 text-sm">Nenhum atendimento no período.</p>}

      {services && services.items.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Assumiu em</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Encerrado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {services.items.map((service) => (
                  <TableRow key={service.serviceId}>
                    <TableCell className="font-medium">{getContactName(service.contact)}</TableCell>
                    <TableCell className="whitespace-nowrap">{getContactPhone(service.contact)}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(service.assignedAt)}</TableCell>
                    <TableCell>
                      <Badge variant={service.status === 4 ? "secondary" : "default"}>
                        {serviceStatusLabel[service.status] ?? "Desconhecido"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(service.finishedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {(services.canPreviousPage || services.canNextPage) && (
            <Pagination className="border-t py-2">
              <PaginationContent>
                {services.canPreviousPage && (
                  <PaginationItem>
                    <PaginationPrevious onClick={() => setPage((current) => current - 1)} />
                  </PaginationItem>
                )}
                <PaginationItem className="text-sm">{page}</PaginationItem>
                {services.canNextPage && (
                  <PaginationItem>
                    <PaginationNext onClick={() => setPage((current) => current + 1)} />
                  </PaginationItem>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
};
