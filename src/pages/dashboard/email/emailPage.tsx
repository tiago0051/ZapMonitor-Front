import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSearchParams } from "react-router";
import { EmailList } from "./emailList/emailList";
import { EmailTemplates } from "./templates/emailTemplates";

export const EmailPage = () => {
  const { can } = useClientContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const canManageTemplates = can("templates.manage");
  const tab = searchParams.get("tab") === "templates" && canManageTemplates ? "templates" : "sent";

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <h1 className="text-2xl font-semibold">E-mails</h1>
      <Tabs value={tab} onValueChange={(value) => setSearchParams(value === "templates" ? { tab: value } : {}, { replace: true })}>
        <TabsList>
          <TabsTrigger value="sent">Enviados</TabsTrigger>
          {canManageTemplates && <TabsTrigger value="templates">Modelos</TabsTrigger>}
        </TabsList>
        <TabsContent value="sent" className="pt-2">
          <EmailList />
        </TabsContent>
        {canManageTemplates && (
          <TabsContent value="templates" className="pt-2">
            <EmailTemplates />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};
