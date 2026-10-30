import { memberService } from "@/services/api/memberService";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";

// Usuários ativos e números de WhatsApp que podem ser vinculados a um grupo de atendimento
export const useServiceGroupOptions = (clientId: string) => {
  const membersQuery = useQuery({
    queryKey: ["members", clientId, "active-list"],
    queryFn: () =>
      memberService.findAll({
        params: { clientId },
        queries: { page: 1, take: 100, status: "ACTIVE" },
      }),
  });

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", clientId],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId }, queries: { page: 1, take: 100 } }),
  });

  return {
    members: membersQuery.data?.items ?? [],
    configurations: configurationsQuery.data?.items ?? [],
    isLoading: membersQuery.isLoading || configurationsQuery.isLoading,
  };
};
