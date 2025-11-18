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
import { useUserContext } from "@/context/UserContext/userContext";
import { Navigate } from "react-router";

const FormSchema = z.object({
  email: z.email(),
  password: z.string().min(6).max(100),
});

type FormSchemaType = z.infer<typeof FormSchema>;

type LoginFormProps = React.ComponentProps<"form"> & {
  onLoginSuccess?: () => void;
};

export function LoginForm({ className, onLoginSuccess, ...props }: LoginFormProps) {
  const { login, isLogged } = useUserContext();

  const loginRequestMutation = useMutation({
    mutationFn: userService.login,
    onSuccess: () => {
      login();
      onLoginSuccess?.();
    },
    onError: requestErrorHandling,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    disabled: loginRequestMutation.isPending,
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = (data: FormSchemaType) => {
    loginRequestMutation.mutate({
      body: {
        email: data.email,
        password: data.password,
      },
    });
  };

  if (isLogged) return <Navigate to="/auth/select_client" />;

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} onSubmit={form.handleSubmit(handleSubmit)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Entre na sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">Insira seu email abaixo para fazer login na sua conta</p>
        </div>
        <div className="grid gap-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="m@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={loginRequestMutation.isPending} className="w-full">
            Entrar
          </Button>
        </div>
      </form>
    </Form>
  );
}
