import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { implanterService } from "@/services/api/implanterService";
import { requestErrorHandling } from "@/utils/request";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FC } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

const schema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
  email: z.string().trim().email("Informe um e-mail válido"),
});

type SchemaType = z.infer<typeof schema>;

export const DialogEditUser: FC<{ user: ImplanterUser }> = ({ user }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const updateUser = useMutation({
    mutationFn: implanterService.updateUser,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["implanterUsers"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Usuário alterado com sucesso");
      setIsOpen(false);
    },
  });

  const form = useForm<SchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, email: user.email },
    disabled: updateUser.isPending,
  });

  const handleSubmit: SubmitHandler<SchemaType> = (data) => {
    updateUser.mutate({ params: { userId: user.id }, body: data });
  };

  useEffect(() => {
    if (isOpen) form.reset({ name: user.name, email: user.email });
  }, [isOpen]);

  if (!user.canEditProfile)
    return (
      <Button variant="ghost" size="sm" disabled title="O usuário também está em tenants que você não implanta">
        Editar
      </Button>
    );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
          <DialogDescription>
            O nome e o e-mail mudam em todos os tenants do usuário. Ele passa a entrar com o novo e-mail.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4" id={`form-edit-user-${user.id}`}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <DialogFooter>
          <Button type="submit" form={`form-edit-user-${user.id}`} disabled={updateUser.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
