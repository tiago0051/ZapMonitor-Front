import { useClientContext } from "@/context/ClientContext/clientContext";
import { assistantService } from "@/services/api/assistantService";
import { useQuery } from "@tanstack/react-query";
import { assistantKeys } from "./assistantUtils";

/** Ferramentas que o assistente pode usar para quem está logado (já filtradas pelas permissões). */
export const useAssistantTools = () => {
  const { client } = useClientContext();
  return useQuery({
    queryKey: assistantKeys.tools(client.id),
    queryFn: () => assistantService.findTools(client.id),
    staleTime: 5 * 60_000,
  });
};
