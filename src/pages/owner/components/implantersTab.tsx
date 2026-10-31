import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import type { UseQueryResult } from "@tanstack/react-query";
import type { FC } from "react";
import { formatNumber } from "../ownerFormat";

type ImplantersTabProps = {
  query: UseQueryResult<OwnerImplanters>;
  onShowClients: (implanterUserId: string) => void;
};

const metrics: {
  key: keyof Pick<OwnerImplanter, "totalClients" | "newClients" | "activeUsers" | "messages" | "services">;
  label: string;
}[] = [
  { key: "totalClients", label: "Tenants" },
  { key: "newClients", label: "Novos no período" },
  { key: "activeUsers", label: "Usuários ativos" },
  { key: "messages", label: "Mensagens no período" },
  { key: "services", label: "Atendimentos no período" },
];

export const ImplantersTab: FC<ImplantersTabProps> = ({ query, onShowClients }) => {
  const isMobile = useIsMobile();
  const implanters = query.data?.implanters ?? [];

  if (query.isLoading) return <p>Carregando...</p>;
  if (query.isError) return <p>Erro ao buscar implantadores.</p>;
  if (implanters.length === 0) return <p className="text-muted-foreground text-sm">Nenhum implantador encontrado.</p>;

  if (isMobile)
    return (
      <div className="space-y-3">
        {implanters.map((implanter) => (
          <Card key={implanter.id} className="gap-3">
            <CardHeader>
              <CardTitle>{implanter.name}</CardTitle>
              <CardDescription className="break-all">{implanter.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-sm">
                {metrics.map((metric) => (
                  <div key={metric.key}>
                    <dt className="text-muted-foreground">{metric.label}</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(implanter[metric.key])}</dd>
                  </div>
                ))}
              </dl>
              <Button variant="outline" size="sm" onClick={() => onShowClients(implanter.id)}>
                Ver tenants
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Implantador</TableHead>
            {metrics.map((metric) => (
              <TableHead key={metric.key} className="text-right">
                {metric.label}
              </TableHead>
            ))}
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {implanters.map((implanter) => (
            <TableRow key={implanter.id}>
              <TableCell>
                <p className="font-medium">{implanter.name}</p>
                <p className="text-muted-foreground text-xs">{implanter.email}</p>
              </TableCell>
              {metrics.map((metric) => (
                <TableCell key={metric.key} className="text-right tabular-nums">
                  {formatNumber(implanter[metric.key])}
                </TableCell>
              ))}
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onShowClients(implanter.id)}>
                  Ver tenants
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
