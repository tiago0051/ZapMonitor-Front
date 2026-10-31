import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ownerService } from "@/services/api/ownerService";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ClientsTab } from "./components/clientsTab";
import { ImplantersTab } from "./components/implantersTab";
import { PeriodFilter } from "./components/periodFilter";
import { formatNumber, periodPresets, toPeriodQuery, type Period } from "./ownerFormat";

export const Owner = () => {
  const [period, setPeriod] = useState<Period>(periodPresets[0].build());
  const [tab, setTab] = useState<string>("implanters");
  const [implanterFilter, setImplanterFilter] = useState<string>("");

  const periodQuery = toPeriodQuery(period);

  const findImplantersQuery = useQuery({
    queryKey: ["owner", "implanters", periodQuery],
    queryFn: () => ownerService.findImplanters({ queries: periodQuery! }),
    enabled: !!periodQuery,
  });

  const implanters = findImplantersQuery.data?.implanters ?? [];
  const totalClients = implanters.reduce((sum, implanter) => sum + implanter.totalClients, 0);
  const newClients = implanters.reduce((sum, implanter) => sum + implanter.newClients, 0);

  const summary = [
    { label: "Implantadores", value: implanters.length },
    { label: "Tenants com responsável", value: totalClients },
    { label: "Novos tenants no período", value: newClients },
    { label: "Tenants sem responsável", value: findImplantersQuery.data?.clientsWithoutImplanter ?? 0 },
  ];

  const showImplanterClients = (implanterUserId: string) => {
    setImplanterFilter(implanterUserId);
    setTab("clients");
  };

  return (
    <div className="flex flex-col gap-4 overflow-auto p-6">
      <div>
        <h1 className="text-2xl">Tela do dono</h1>
        <p className="text-muted-foreground text-sm">Acompanhe os tenants de cada implantador e quanto eles são usados.</p>
      </div>

      <PeriodFilter period={period} onChange={setPeriod} />
      {!periodQuery && <p className="text-destructive text-sm">Escolha um período em que o início seja antes do fim.</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="gap-1 py-4">
            <CardHeader className="px-4">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{findImplantersQuery.isLoading ? "–" : formatNumber(item.value)}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="implanters">Implantadores</TabsTrigger>
          <TabsTrigger value="clients">Tenants</TabsTrigger>
        </TabsList>
        <TabsContent value="implanters" className="pt-2">
          <ImplantersTab query={findImplantersQuery} onShowClients={showImplanterClients} />
        </TabsContent>
        <TabsContent value="clients" className="flex flex-col gap-4 pt-2">
          {periodQuery && (
            <ClientsTab
              period={periodQuery}
              implanters={implanters}
              implanterFilter={implanterFilter}
              onImplanterFilterChange={setImplanterFilter}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
