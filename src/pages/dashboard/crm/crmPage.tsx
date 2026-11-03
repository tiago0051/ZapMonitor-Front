import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams } from "react-router";
import { CrmBoard } from "./crmBoard";
import { CrmReports } from "./crmReports";
import { MyTasks } from "./myTasks";

const tabs = ["deals", "tasks", "reports"] as const;
type CrmTab = (typeof tabs)[number];

export const CrmPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") as CrmTab;
  const tab: CrmTab = tabs.includes(requestedTab) ? requestedTab : "deals";

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setSearchParams({ tab: value }, { replace: true })}
      className="flex h-full flex-col gap-0 overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-4 border-b px-4 pt-4 pb-3">
        <h1 className="text-2xl font-semibold">CRM</h1>
        <TabsList>
          <TabsTrigger value="deals">Negócios</TabsTrigger>
          <TabsTrigger value="tasks">Minhas tarefas</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="deals" className="flex min-h-0 flex-1 flex-col">
        <CrmBoard />
      </TabsContent>
      <TabsContent value="tasks" className="flex min-h-0 flex-1 flex-col">
        <MyTasks />
      </TabsContent>
      <TabsContent value="reports" className="flex min-h-0 flex-1 flex-col">
        <CrmReports />
      </TabsContent>
    </Tabs>
  );
};
