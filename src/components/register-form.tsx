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
import { Link, Navigate } from "react-router";
import { toast } from "sonner";

const FormSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    email: z.email("E-mail inválido"),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(100),
    confirmPassword: z.string().min(8, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais",
  });

type FormSchemaType = z.infer<typeof FormSchema>;

type RegisterFormProps = React.ComponentProps<"form"> & {
  onRegisterSuccess?: () => void;
};

export function RegisterForm({ className, onRegisterSuccess, ...props }: RegisterFormProps) {
  const { isLogged } = useUserContext();

  const registerRequestMutation = useMutation({
    mutationFn: userService.register,
    onSuccess: () => {
      toast.success("Conta criada com sucesso. Verifique seu e-mail para continuar.");
      onRegisterSuccess?.();
    },
    onError: requestErrorHandling,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    disabled: registerRequestMutation.isPending,
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = (data: FormSchemaType) => {
    registerRequestMutation.mutate({
      body: {
        name: data.name,
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
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">Preencha os dados abaixo para começar</p>
        </div>
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="João Silva" {...field} />
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
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="m@exemplo.com" type="email" {...field} />
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

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar senha</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={registerRequestMutation.isPending} className="w-full">
            Criar conta
          </Button>
        </div>

        <div className="text-center text-sm">
          Já tem conta?{" "}
          <Link to="/auth/login" className="underline underline-offset-4">
            Entrar
          </Link>
        </div>
      </form>
    </Form>
  );
}
