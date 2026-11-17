import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsTab } from "./components/clientsTab";
import { UsersTab } from "./components/usersTab";
import { useSearchParams } from "react-router";

const implanterTabs = ["clients", "users"];

export const Implanter = () => {
  // Aba na URL, como na tela do dono: recarregar ou compartilhar o link mantém a mesma visão
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab") ?? "";
  const tab = implanterTabs.includes(requestedTab) ? requestedTab : "clients";
  const setTab = (value: string) =>
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("tab", value);
        return next;
      },
      { replace: true },
    );

  return (
    <div className="flex max-h-full flex-col gap-4 overflow-hidden p-4 md:p-6">
      <div>
        <h1 className="text-2xl">Painel do implantador</h1>
        <p className="text-muted-foreground text-sm">Tenants que você implanta e os usuários que têm acesso a eles.</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="overflow-hidden">
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
