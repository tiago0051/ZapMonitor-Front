import { useClientContext } from "@/context/ClientContext/clientContext";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { useQuery } from "@tanstack/react-query";
import { useLocalStorage } from "usehooks-ts";

// Grupo de atendimento escolhido pelo usuário para filtrar a fila, lembrado por cliente
export const useServiceGroupSelection = () => {
  const { client } = useClientContext();

  const [storedServiceGroupId, setSelectedServiceGroupId] = useLocalStorage<string | null>(`whatsapp:serviceGroup:${client.id}`, null);

  const myServiceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", client.id, "mine"],
    queryFn: () => serviceGroupService.findMine({ params: { clientId: client.id } }),
  });

  const serviceGroups = myServiceGroupsQuery.data ?? [];
  const selectedServiceGroup = serviceGroups.find((group) => group.id === storedServiceGroupId) ?? serviceGroups[0];

  return {
    serviceGroups,
    selectedServiceGroupId: selectedServiceGroup?.id,
    setSelectedServiceGroupId,
    isLoading: myServiceGroupsQuery.isLoading,
  };
};
