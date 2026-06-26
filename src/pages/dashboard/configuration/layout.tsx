import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import { WhatsappConfiguration } from "./whatsapp/whatsappConfiguration/whatsappConfiguration";
import { WhatsappCategory } from "./whatsapp/whatsappCategory/whatsappCategory";
import { WhatsappAiConfiguration } from "./whatsapp/whatsappAi/whatsappAiConfiguration";

export const EditClientLayout = () => {
  const { clientId } = useParams();

  const findClientByIdQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
  });

  const client = findClientByIdQuery.data;

  return (
    <>
      <div className="flex justify-between">
        <h1 className="text-2xl">{client?.name}</h1>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList className="mb-4">
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="integration">Integração</TabsTrigger>
        </TabsList>
        <TabsContent value="whatsapp" className="space-y-5">
          <WhatsappCategory />
          <WhatsappConfiguration />
          <WhatsappAiConfiguration />
        </TabsContent>
        <TabsContent value="integration">Integration settings here.</TabsContent>
      </Tabs>
    </>
  );
};
