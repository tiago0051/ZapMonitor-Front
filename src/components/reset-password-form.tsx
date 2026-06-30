import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "./ui/form";
import { userService } from "@/services/api/userSevice";
import { requestErrorHandling } from "@/utils/request";
import { Link } from "react-router";
import { toast } from "sonner";

const FormSchema = z
  .object({
    newPassword: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(100),
    confirmPassword: z.string().min(8, "Confirme sua senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais",
  });

type FormSchemaType = z.infer<typeof FormSchema>;

type ResetPasswordFormProps = React.ComponentProps<"form"> & {
  token: string;
  onResetSuccess?: () => void;
};

export function ResetPasswordForm({ className, token, onResetSuccess, ...props }: ResetPasswordFormProps) {
  const resetPasswordMutation = useMutation({
    mutationFn: userService.resetPassword,
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso.");
      onResetSuccess?.();
    },
    onError: requestErrorHandling,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    disabled: resetPasswordMutation.isPending,
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = (data: FormSchemaType) => {
    resetPasswordMutation.mutate({
      body: {
        token,
        newPassword: data.newPassword,
      },
    });
  };

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} onSubmit={form.handleSubmit(handleSubmit)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Redefinir senha</h1>
          <p className="text-muted-foreground text-sm text-balance">Defina uma nova senha para acessar sua conta</p>
        </div>

        <div className="grid gap-4">
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

          <Button type="submit" disabled={resetPasswordMutation.isPending} className="w-full">
            Redefinir senha
          </Button>
        </div>

        <div className="text-center text-sm">
          <Link to="/auth/login" className="underline underline-offset-4">
            Voltar ao login
          </Link>
        </div>
      </form>
    </Form>
  );
}
