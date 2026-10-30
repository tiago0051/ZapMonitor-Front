import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Phone, Users } from "lucide-react";
import { useParams } from "react-router";
import { DialogDeleteServiceGroup } from "./components/dialogDeleteServiceGroup";
import { DialogSaveServiceGroup } from "./components/dialogSaveServiceGroup";
import { useServiceGroupOptions } from "./useServiceGroupOptions";

export const ServiceGroups = () => {
  const { clientId } = useParams();

  const findAllServiceGroupsQuery = useSuspenseQuery({
    queryKey: ["serviceGroups", clientId],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: clientId! } }),
  });

  const { members, configurations } = useServiceGroupOptions(clientId!);

  const serviceGroups = findAllServiceGroupsQuery.data;

  const getMemberName = (userId: string) => {
    const member = members.find((item) => item.id === userId);
    return member?.name ?? member?.email ?? "Usuário removido";
  };

  const getPhoneNumber = (configurationId: string) =>
    configurations.find((item) => item.id === configurationId)?.phoneNumber ?? "Número removido";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Grupos de atendimento</CardTitle>
          <CardDescription>
            Defina quais usuários atendem cada número de WhatsApp. Números sem grupo aparecem na fila de todos.
          </CardDescription>
        </div>
        <DialogSaveServiceGroup clientId={clientId!} serviceGroups={serviceGroups} />
      </CardHeader>
      <CardContent>
        {serviceGroups.length === 0 && <p className="text-muted-foreground text-sm">Nenhum grupo de atendimento cadastrado.</p>}

        {serviceGroups.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceGroups.map((serviceGroup) => (
              <div key={serviceGroup.id} className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-base font-semibold">{serviceGroup.name}</h3>
                  <div className="flex shrink-0">
                    <DialogSaveServiceGroup clientId={clientId!} serviceGroup={serviceGroup} serviceGroups={serviceGroups} />
                    <DialogDeleteServiceGroup clientId={clientId!} serviceGroup={serviceGroup} />
                  </div>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <Users className="h-3.5 w-3.5" />
                    {serviceGroup.userIds.length} usuário(s)
                  </div>
                  <p className="line-clamp-2">{serviceGroup.userIds.map(getMemberName).join(", ") || "—"}</p>
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <Phone className="h-3.5 w-3.5" />
                    {serviceGroup.whatsappConfigurationIds.length} número(s)
                  </div>
                  <p className="line-clamp-2">{serviceGroup.whatsappConfigurationIds.map(getPhoneNumber).join(", ") || "—"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
