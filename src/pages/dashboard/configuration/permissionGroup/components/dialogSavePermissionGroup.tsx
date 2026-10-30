import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { permissionGroupService } from "@/services/api/permissionGroupService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { usePermissionCatalog } from "../usePermissionCatalog";

type DialogSavePermissionGroupProps = {
  clientId: string;
  permissionGroup?: PermissionGroup;
};

const schema = z.object({
  name: z.string().trim().min(1, "O nome do grupo é obrigatório"),
  description: z.string().trim(),
  permissions: z.array(z.string()).min(1, "Selecione ao menos uma permissão"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogSavePermissionGroup: FC<DialogSavePermissionGroupProps> = ({ clientId, permissionGroup }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isEditing = !!permissionGroup;

  const queryClient = useQueryClient();
  const { can } = useClientContext();
  const { modules, isLoading } = usePermissionCatalog(clientId);

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["permissionGroups", clientId] });
    // Quem está no grupo pode ser o próprio usuário logado
    queryClient.invalidateQueries({ queryKey: ["clientAccess", clientId] });
    toast.success(isEditing ? "Grupo atualizado com sucesso" : "Grupo criado com sucesso");
    setIsOpen(false);
  };

  const createPermissionGroup = useMutation({
    mutationFn: permissionGroupService.create,
    onError: requestErrorHandling,
    onSuccess,
  });

  const updatePermissionGroup = useMutation({
    mutationFn: permissionGroupService.update,
    onError: requestErrorHandling,
    onSuccess,
  });

  const isPending = createPermissionGroup.isPending || updatePermissionGroup.isPending;

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "", permissions: [] },
    disabled: isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    const body = { name: data.name, description: data.description || null, permissions: data.permissions as Permission[] };

    if (permissionGroup) {
      updatePermissionGroup.mutate({ params: { clientId, permissionGroupId: permissionGroup.id }, body });
      return;
    }

    createPermissionGroup.mutate({ params: { clientId }, body });
  };

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: permissionGroup?.name ?? "",
      description: permissionGroup?.description ?? "",
      permissions: permissionGroup?.permissions ?? [],
    });
  }, [isOpen]);

  const toggleValue = (values: string[], value: string, checked: boolean) =>
    checked ? [...values, value] : values.filter((item) => item !== value);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 shrink-0">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Novo grupo</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grupo de permissão" : "Novo grupo de permissão"}</DialogTitle>
          <DialogDescription>Escolha o que os usuários deste grupo podem ver e fazer.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-permission-group">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Supervisor" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Opcional" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissões</FormLabel>
                  <div className="space-y-4 rounded-md border p-3">
                    {isLoading && <p className="text-muted-foreground text-sm">Carregando...</p>}
                    {modules.map((module) => (
                      <div key={module.name} className="space-y-2">
                        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{module.name}</p>
                        {module.permissions.map((definition) => {
                          // Só é possível conceder o que o próprio usuário tem
                          const isGrantable = can(definition.key);

                          return (
                            <label
                              key={definition.key}
                              className="flex cursor-pointer items-start gap-2 text-sm has-[button:disabled]:cursor-not-allowed has-[button:disabled]:opacity-60"
                            >
                              <Checkbox
                                className="mt-0.5"
                                checked={field.value.includes(definition.key)}
                                disabled={field.disabled || !isGrantable}
                                onCheckedChange={(checked) => field.onChange(toggleValue(field.value, definition.key, checked === true))}
                              />
                              <span>
                                <span className="font-medium">{definition.label}</span>
                                <span className="text-muted-foreground block text-xs">{definition.description}</span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form-permission-group" disabled={isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
