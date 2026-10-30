import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router";
import { WhatsappConfiguration } from "./whatsapp/whatsappConfiguration/whatsappConfiguration";
import { WhatsappCategory } from "./whatsapp/whatsappCategory/whatsappCategory";
import { WhatsappAiConfiguration } from "./whatsapp/whatsappAi/whatsappAiConfiguration";
import { WhatsappTemplate } from "./whatsapp/whatsappTemplate/whatsappTemplate";
import { WhatsappEmbeddedSignup } from "./whatsapp/whatsappEmbeddedSignup/whatsappEmbeddedSignup";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ServiceGroups } from "./serviceGroup/serviceGroup";
import { AiAgents } from "./aiAgent/aiAgents";
import { Flows } from "./flow/flows";

export const EditClientLayout = () => {
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const findClientByIdQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
  });

  const client = findClientByIdQuery.data;

  return (
    <div className="flex h-full flex-col overflow-auto p-6">
      <div className="mb-4 flex justify-between">
        <h1 className="text-2xl">{client?.name}</h1>
      </div>

      <Tabs value={searchParams.get("tab") ?? "whatsapp"} onValueChange={(tab) => setSearchParams({ tab }, { replace: true })}>
        <TabsList className="mb-4">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="whatsappConfiguration">Números</TabsTrigger>
          <TabsTrigger value="serviceGroup">Grupos de atendimento</TabsTrigger>
          <TabsTrigger value="aiAgent">Agentes de IA</TabsTrigger>
          <TabsTrigger value="flow">Fluxos</TabsTrigger>
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="integration" disabled>
            Integração
          </TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="space-y-5">
          <WhatsappCategory />
          <WhatsappAiConfiguration />
          <WhatsappTemplate />
        </TabsContent>
        <TabsContent value="whatsappConfiguration" className="space-y-5">
          <WhatsappEmbeddedSignup />
          <WhatsappConfiguration />
        </TabsContent>
        <TabsContent value="serviceGroup" className="space-y-5">
          <ServiceGroups />
        </TabsContent>
        <TabsContent value="aiAgent" className="space-y-5">
          <AiAgents />
        </TabsContent>
        <TabsContent value="flow" className="space-y-5">
          <Flows />
        </TabsContent>
        <TabsContent value="account">
          <ChangePasswordForm />
        </TabsContent>
        <TabsContent value="integration">Integration settings here.</TabsContent>
      </Tabs>
    </div>
  );
};
