import { useClientContext } from "@/context/ClientContext/clientContext";
import { memberService } from "@/services/api/memberService";
import { useQuery } from "@tanstack/react-query";

/** Membros ativos do cliente, para escolher o responsável da tarefa. */
export const usePlannerMembers = () => {
  const { client } = useClientContext();
  const query = useQuery({
    queryKey: ["members", client.id, "active-list"],
    queryFn: () => memberService.findAll({ params: { clientId: client.id }, queries: { page: 1, take: 100, status: "ACTIVE" } }),
  });
  return query.data?.items ?? [];
};
