import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsTab } from "./components/clientsTab";
import { UsersTab } from "./components/usersTab";

export const Implanter = () => {
  return (
    <div className="flex max-h-full flex-col gap-4 overflow-hidden p-6">
      <div>
        <h1 className="text-2xl">Painel do implantador</h1>
        <p className="text-muted-foreground text-sm">Tenants que você implanta e os usuários que têm acesso a eles.</p>
      </div>

      <Tabs defaultValue="clients" className="overflow-hidden">
        <TabsList>
          <TabsTrigger value="clients">Tenants</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>
        <TabsContent value="clients" className="overflow-auto pt-2">
          <ClientsTab />
        </TabsContent>
        <TabsContent value="users" className="flex flex-col gap-4 overflow-hidden pt-2">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
