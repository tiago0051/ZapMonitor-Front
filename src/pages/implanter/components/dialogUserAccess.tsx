import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { useUserContext } from "@/context/UserContext/userContext";
import { MemberRoleSelectFields } from "@/pages/dashboard/members/components/memberRoleFields";
import { memberRoleShape, refineMemberRole } from "@/pages/dashboard/members/components/memberRoleSchema";
import { memberService } from "@/services/api/memberService";
import { permissionGroupService } from "@/services/api/permissionGroupService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

// O implantador tem todas as permissões nos tenants que implanta, então pode conceder qualquer papel
const roleOptions: TenantRole[] = ["IMPLANTER", "ADMIN", "SUPERVISOR", "ATTENDANT", "CUSTOM"];

const schema = z.object(memberRoleShape).superRefine(refineMemberRole);

type SchemaType = z.infer<typeof schema>;

export const DialogUserAccess: FC<{ user: ImplanterUser }> = ({ user }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const { user: loggedUser } = useUserContext();

  const isLoggedUser = loggedUser?.id === user.id;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Acessos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-auto">
        <DialogHeader>
          <DialogTitle>Acessos de {user.name}</DialogTitle>
          <DialogDescription>
            {isLoggedUser
              ? "Você não pode alterar o seu próprio acesso. Peça a outro implantador."
              : "Papel e status do usuário em cada tenant que você implanta. As mudanças valem na hora."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          {user.memberships.map((membership, index) => (
            <div key={membership.clientId} className="grid gap-4">
              {index > 0 && <Separator />}
              <MembershipAccessForm userId={user.id} membership={membership} disabled={isLoggedUser} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

type MembershipAccessFormProps = {
  userId: string;
  membership: ImplanterUserMembership;
  disabled: boolean;
};

const MembershipAccessForm: FC<MembershipAccessFormProps> = ({ userId, membership, disabled }) => {
  const queryClient = useQueryClient();
  const params = { clientId: membership.clientId, userId };

  const findPermissionGroupsQuery = useQuery({
    queryKey: ["permissionGroups", membership.clientId],
    queryFn: () => permissionGroupService.findAll({ params: { clientId: membership.clientId } }),
  });

  const onSuccess = (message: string) => {
    queryClient.invalidateQueries({ queryKey: ["implanterUsers"] });
    queryClient.invalidateQueries({ queryKey: ["implanterClients"] });
    queryClient.invalidateQueries({ queryKey: ["members", membership.clientId] });
    toast.success(message);
  };

  const changeRole = useMutation({
    mutationFn: memberService.changeRole,
    onError: requestErrorHandling,
    onSuccess: () => onSuccess("Papel alterado com sucesso"),
  });

  const changeStatus = useMutation({
    mutationFn: membership.active ? memberService.deactivate : memberService.activate,
    onError: requestErrorHandling,
    onSuccess: () => onSuccess(membership.active ? "Acesso desativado" : "Acesso ativado"),
  });

  const isPending = changeRole.isPending || changeStatus.isPending;

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    values: { role: membership.role, permissionGroupId: membership.permissionGroupId ?? "" },
    disabled: disabled || isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    changeRole.mutate({ params, body: { role: data.role, permissionGroupId: data.role === "CUSTOM" ? data.permissionGroupId : null } });
  };

  const formId = `form-access-${userId}-${membership.clientId}`;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate font-medium">{membership.clientName}</p>
        <Badge variant={membership.active ? "default" : "secondary"}>{membership.active ? "Ativo" : "Inativo"}</Badge>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id={formId}>
          <MemberRoleSelectFields roleOptions={roleOptions} permissionGroupOptions={findPermissionGroupsQuery.data ?? []} />
        </form>
      </Form>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant={membership.active ? "outline" : "secondary"}
          size="sm"
          disabled={disabled || isPending}
          onClick={() => changeStatus.mutate({ params })}
        >
          {membership.active ? "Desativar acesso" : "Ativar acesso"}
        </Button>
        <Button type="submit" form={formId} size="sm" disabled={disabled || isPending || !form.formState.isDirty}>
          Salvar papel
        </Button>
      </div>
    </div>
  );
};
