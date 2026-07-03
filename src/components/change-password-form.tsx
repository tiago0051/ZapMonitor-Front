import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { userService } from "@/services/api/userSevice";
import { requestErrorHandling } from "@/utils/request";
import { toast } from "sonner";

const FormSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual"),
    newPassword: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres").max(100),
    confirmPassword: z.string().min(8, "Confirme a nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais",
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    path: ["newPassword"],
    message: "A nova senha precisa ser diferente da senha atual",
  });

type FormSchemaType = z.infer<typeof FormSchema>;

export function ChangePasswordForm() {
  const changePasswordMutation = useMutation({
    mutationFn: userService.changePassword,
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      form.reset();
    },
    onError: requestErrorHandling,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    disabled: changePasswordMutation.isPending,
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = (data: FormSchemaType) => {
    changePasswordMutation.mutate({
      body: {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      },
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="max-w-xl space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Alterar senha</h2>
          <p className="text-muted-foreground text-sm">Atualize sua senha para manter sua conta segura.</p>
        </div>

        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha atual</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova senha</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar nova senha</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={changePasswordMutation.isPending}>
          Salvar nova senha
        </Button>
      </form>
    </Form>
  );
}
