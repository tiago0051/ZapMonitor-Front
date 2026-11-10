import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { flowService } from "@/services/api/flowService";
import { Pencil } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { useServiceGroupOptions } from "../useServiceGroupOptions";

type DialogSaveServiceGroupProps = {
  clientId: string;
  serviceGroup?: ServiceGroup;
  serviceGroups: ServiceGroup[];
};

const schema = z.object({
  name: z.string().trim().min(1, "O nome do grupo é obrigatório"),
  userIds: z.array(z.string()).min(1, "Selecione ao menos um usuário"),
  whatsappConfigurationIds: z.array(z.string()),
  queueFlowId: z.string(),
});

type SchemaType = z.infer<typeof schema>;

export const DialogSaveServiceGroup: FC<DialogSaveServiceGroupProps> = ({ clientId, serviceGroup, serviceGroups }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const isEditing = !!serviceGroup;

  const queryClient = useQueryClient();
  const { members, configurations, isLoading } = useServiceGroupOptions(clientId);
  const flowsQuery = useQuery({
    queryKey: ["flows", clientId],
    queryFn: () => flowService.findAll({ params: { clientId } }),
    enabled: isOpen,
  });
  const queueFlows = (flowsQuery.data ?? []).filter((flow) => flow.kind === "QUEUE");

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["serviceGroups", clientId] });
    toast.success(isEditing ? "Grupo atualizado com sucesso" : "Grupo criado com sucesso");
    setIsOpen(false);
  };

  const createServiceGroup = useMutation({
    mutationFn: serviceGroupService.create,
    onError: requestErrorHandling,
    onSuccess,
  });

  const updateServiceGroup = useMutation({
    mutationFn: serviceGroupService.update,
    onError: requestErrorHandling,
    onSuccess,
  });

  const isPending = createServiceGroup.isPending || updateServiceGroup.isPending;

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      userIds: [],
      whatsappConfigurationIds: [],
      queueFlowId: "",
    },
    disabled: isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = ({ queueFlowId, ...rest }) => {
    const data = { ...rest, queueFlowId: queueFlowId || null };
    if (serviceGroup) {
      updateServiceGroup.mutate({ params: { clientId, serviceGroupId: serviceGroup.id }, body: data });
      return;
    }

    createServiceGroup.mutate({ params: { clientId }, body: data });
  };

  useEffect(() => {
    if (!isOpen) return;

    form.reset({
      name: serviceGroup?.name ?? "",
      userIds: serviceGroup?.userIds ?? [],
      whatsappConfigurationIds: serviceGroup?.whatsappConfigurationIds ?? [],
      queueFlowId: serviceGroup?.queueFlowId ?? "",
    });
  }, [isOpen]);

  // Um número pertence a um único grupo; mostra onde ele está hoje para deixar claro que será movido
  const findOtherGroupName = (configurationId: string) =>
    serviceGroups.find((group) => group.id !== serviceGroup?.id && group.whatsappConfigurationIds.includes(configurationId))?.name;

  const toggleValue = (values: string[], value: string, checked: boolean) =>
    checked ? [...values, value] : values.filter((item) => item !== value);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-8 w-8 shrink-0"
            aria-label={`Editar ${serviceGroup?.name ?? "grupo"}`}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>Novo grupo</Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar grupo de atendimento" : "Novo grupo de atendimento"}</DialogTitle>
          <DialogDescription>
            Defina quais usuários atendem os contatos que chegam pelos números de WhatsApp selecionados.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id="form-service-group">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex.: Comercial" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="userIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usuários</FormLabel>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                    {isLoading && <LoadingState className="justify-start py-0" />}
                    {!isLoading && members.length === 0 && <p className="text-muted-foreground text-sm">Nenhum usuário ativo.</p>}
                    {members.map((member) => (
                      <label key={member.id} className="flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={field.value.includes(member.id)}
                          disabled={field.disabled}
                          onCheckedChange={(checked) => field.onChange(toggleValue(field.value, member.id, checked === true))}
                        />
                        <span className="truncate">{member.name ?? member.email}</span>
                        {member.name && <span className="text-muted-foreground truncate text-xs">{member.email}</span>}
                      </label>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsappConfigurationIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Números de WhatsApp</FormLabel>
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                    {isLoading && <LoadingState className="justify-start py-0" />}
                    {!isLoading && configurations.length === 0 && (
                      <p className="text-muted-foreground text-sm">Nenhum número cadastrado.</p>
                    )}
                    {configurations.map((configuration) => {
                      const otherGroupName = findOtherGroupName(configuration.id);

                      return (
                        <label key={configuration.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={field.value.includes(configuration.id)}
                            disabled={field.disabled}
                            onCheckedChange={(checked) => field.onChange(toggleValue(field.value, configuration.id, checked === true))}
                          />
                          <span>{configuration.phoneNumber}</span>
                          {otherGroupName && <span className="text-muted-foreground text-xs">(hoje em {otherGroupName})</span>}
                        </label>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="queueFlowId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fluxo de fila</FormLabel>
                  <select
                    className="border-input dark:bg-input/30 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs"
                    value={field.value}
                    disabled={field.disabled}
                    onChange={(event) => field.onChange(event.target.value)}
                  >
                    <option value="">Nenhum</option>
                    {queueFlows.map((flow) => (
                      <option key={flow.id} value={flow.id}>
                        {flow.name}
                        {flow.active ? "" : " (inativo)"}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-xs">
                    Age enquanto o contato espera neste grupo: mensagens a cada período e resposta a quem escreve. O nó Grupo de um fluxo
                    pode escolher outro. Crie em Fluxos de atendimento, com o tipo Fila.
                  </p>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button type="submit" form="form-service-group" disabled={isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
