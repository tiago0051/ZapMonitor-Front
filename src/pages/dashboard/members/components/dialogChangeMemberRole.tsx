import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { memberService } from "@/services/api/memberService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { MemberRoleFields } from "./memberRoleFields";
import { memberRoleShape, refineMemberRole } from "./memberRoleSchema";

type DialogChangeMemberRoleProps = {
  clientId: string;
  member: Member;
};

const schema = z.object(memberRoleShape).superRefine(refineMemberRole);

type SchemaType = z.infer<typeof schema>;

export const DialogChangeMemberRole: FC<DialogChangeMemberRoleProps> = ({ clientId, member }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const changeRole = useMutation({
    mutationFn: memberService.changeRole,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      queryClient.invalidateQueries({ queryKey: ["permissionGroups", clientId] });
      toast.success("Papel alterado com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { role: member.role, permissionGroupId: member.permissionGroupId ?? "" },
    disabled: changeRole.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    changeRole.mutate({
      params: { clientId, userId: member.id },
      body: { role: data.role, permissionGroupId: data.role === "CUSTOM" ? data.permissionGroupId : null },
    });
  };

  useEffect(() => {
    if (isOpen) form.reset({ role: member.role, permissionGroupId: member.permissionGroupId ?? "" });
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Alterar papel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar papel</DialogTitle>
          <DialogDescription>
            Defina o que {member.name ?? member.email} pode acessar neste cliente. A mudança vale na hora.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-change-member-role">
            <MemberRoleFields clientId={clientId} />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form="form-change-member-role" disabled={changeRole.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
