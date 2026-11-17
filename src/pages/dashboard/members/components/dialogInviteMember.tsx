import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { Input } from "@/components/ui/input";
import { memberService } from "@/services/api/memberService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { MemberRoleFields } from "./memberRoleFields";
import { memberRoleShape, refineMemberRole } from "./memberRoleSchema";

type DialogInviteMemberProps = { className?: string; clientId: string };

const schema = z
  .object({
    email: z.email("E-mail inválido"),
    serviceGroupIds: z.array(z.string()),
    ...memberRoleShape,
  })
  .superRefine(refineMemberRole);

const defaultValues: z.infer<typeof schema> = { email: "", serviceGroupIds: [], role: "ATTENDANT", permissionGroupId: "" };

type SchemaType = z.infer<typeof schema>;

export const DialogInviteMember: FC<DialogInviteMemberProps> = ({ clientId, className }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const inviteMember = useMutation({
    mutationFn: memberService.invite,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      toast.success("Convite enviado com sucesso");
      setIsOpen(false);
    },
  });

  const findServiceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", clientId],
    queryFn: () => serviceGroupService.findAll({ params: { clientId } }),
    enabled: isOpen,
  });
  const serviceGroups = findServiceGroupsQuery.data ?? [];

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues,
    disabled: inviteMember.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    inviteMember.mutate({
      body: { ...data, permissionGroupId: data.role === "CUSTOM" ? data.permissionGroupId : null },
      params: { clientId },
    });
  };

  useEffect(() => {
    if (!isOpen) form.reset(defaultValues);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className={className}>Convidar usuário</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convidar usuário</DialogTitle>
          <DialogDescription>Envie um convite por e-mail para adicionar um novo usuário a este cliente.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-invite-member">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="m@exemplo.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <MemberRoleFields clientId={clientId} />
            {serviceGroups.length > 0 && (
              <FormField
                control={form.control}
                name="serviceGroupIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupos de atendimento</FormLabel>
                    <FormDescription>A pessoa já entra nestes grupos quando aceitar o convite. Dá para mudar depois.</FormDescription>
                    <div className="grid max-h-40 gap-2 overflow-auto rounded-md border p-2">
                      {serviceGroups.map((group) => {
                        const checked = field.value.includes(group.id);
                        return (
                          <label key={group.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              disabled={field.disabled}
                              onCheckedChange={(value) =>
                                field.onChange(value ? [...field.value, group.id] : field.value.filter((id) => id !== group.id))
                              }
                            />
                            <span className="truncate">{group.name}</span>
                          </label>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form="form-invite-member" disabled={inviteMember.isPending}>
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
