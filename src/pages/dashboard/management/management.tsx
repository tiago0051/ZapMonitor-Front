import { NoPermission } from "@/components/permission-route";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSearchParams } from "react-router";
import { AttendedTab } from "./components/attendedTab";
import { InProgressTab } from "./components/inProgressTab";
import { PerformanceTab } from "./components/performanceTab";

type ManagementTab = { id: string; label: string; permission: Permission; content: React.ReactNode };

const tabs: ManagementTab[] = [
  { id: "inProgress", label: "Em andamento", permission: "management.view", content: <InProgressTab /> },
  { id: "attended", label: "Atendidos no período", permission: "management.view", content: <AttendedTab /> },
  { id: "performance", label: "Desempenho do WhatsApp", permission: "reports.view", content: <PerformanceTab /> },
];

export const Management = () => {
  const { can } = useClientContext();
  const [searchParams, setSearchParams] = useSearchParams();

  const allowedTabs = tabs.filter((tab) => can(tab.permission));
  if (allowedTabs.length === 0) return <NoPermission />;

  // A aba fica na URL (?tab=) para os atalhos da tela de início abrirem direto nela
  const requestedTab = searchParams.get("tab");
  const activeTab = allowedTabs.find((tab) => tab.id === requestedTab)?.id ?? allowedTabs[0].id;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestão</h1>
        <p className="text-muted-foreground text-sm">
          Acompanhe a equipe agora, quem cada colaborador atendeu e o desempenho do WhatsApp em qualquer período.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(tab) => setSearchParams({ tab }, { replace: true })}>
        <TabsList className="max-w-full justify-start overflow-x-auto">
          {allowedTabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {allowedTabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="pt-2">
            {tab.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
