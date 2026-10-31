import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendedTab } from "./components/attendedTab";
import { InProgressTab } from "./components/inProgressTab";

export const Management = () => {
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Gestão da equipe</h1>
        <p className="text-muted-foreground text-sm">Acompanhe com quem cada colaborador está e quem ele atendeu em cada período.</p>
      </div>

      <Tabs defaultValue="inProgress">
        <TabsList>
          <TabsTrigger value="inProgress">Em andamento</TabsTrigger>
          <TabsTrigger value="attended">Atendidos no período</TabsTrigger>
        </TabsList>
        <TabsContent value="inProgress" className="pt-2">
          <InProgressTab />
        </TabsContent>
        <TabsContent value="attended" className="pt-2">
          <AttendedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
