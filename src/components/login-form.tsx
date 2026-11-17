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
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Label } from "./ui/label";

const FormSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(100),
});

type FormSchemaType = z.infer<typeof FormSchema>;

type LoginFormProps = React.ComponentProps<"form"> & {
  onLoginSuccess?: () => void;
  /** Para onde vai quem já está logado */
  redirectTo?: string;
};

export function LoginForm({ className, onLoginSuccess, redirectTo = "/auth/select_client", ...props }: LoginFormProps) {
  const { login, isLogged } = useUserContext();
  // Senha certa com verificação em duas etapas ativa: guarda o e-mail e a senha e pede o código do app
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  const [code, setCode] = useState("");

  const loginRequestMutation = useMutation({
    mutationFn: userService.login,
    onSuccess: (response, variables) => {
      if (response?.twoFactorRequired) {
        setPendingCredentials({ email: variables.body.email, password: variables.body.password });
        setCode("");
        return;
      }
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

  if (isLogged) return <Navigate to={redirectTo} replace />;

  if (pendingCredentials) {
    const handleCodeSubmit = (event: React.FormEvent) => {
      event.preventDefault();
      if (!code.trim()) return;
      loginRequestMutation.mutate({ body: { ...pendingCredentials, code: code.trim() } });
    };

    return (
      <form className={cn("flex flex-col gap-6", className)} onSubmit={handleCodeSubmit}>
        <div className="flex flex-col items-center gap-2 text-center">
          <ShieldCheck className="text-primary h-8 w-8" />
          <h1 className="text-2xl font-bold">Verificação em duas etapas</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Abra o app autenticador no celular e digite o código de 6 dígitos do ZapMonitor.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="two-factor-code">Código</Label>
          <Input
            id="two-factor-code"
            value={code}
            onChange={(event) => setCode(event.currentTarget.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={20}
            placeholder="123456"
            disabled={loginRequestMutation.isPending}
          />
          <p className="text-muted-foreground text-xs">
            Sem acesso ao app? Digite um dos códigos de recuperação que você guardou ao ativar.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={loginRequestMutation.isPending || !code.trim()}>
          Entrar
        </Button>
        <Button type="button" variant="link" className="text-muted-foreground" onClick={() => setPendingCredentials(null)}>
          Voltar
        </Button>
      </form>
    );
  }

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
                <div className="flex items-center justify-between">
                  <FormLabel>Senha</FormLabel>
                  <Link to="/auth/forgot-password" className="text-muted-foreground text-xs underline underline-offset-4">
                    Esqueci minha senha
                  </Link>
                </div>
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

        <div className="text-center text-sm">
          Ainda não tem conta?{" "}
          <Link to="/auth/register" className="underline underline-offset-4">
            Criar conta
          </Link>
        </div>
      </form>
    </Form>
  );
}
