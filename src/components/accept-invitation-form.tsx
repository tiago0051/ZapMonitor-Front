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
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useState, type FC } from "react";

const FormSchema = z
  .object({
    name: z.string().min(1, "Nome é obrigatório"),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres").max(100),
    confirmPassword: z.string().min(8, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas precisam ser iguais",
  });

type FormSchemaType = z.infer<typeof FormSchema>;

type AcceptInvitationFormProps = {
  className?: string;
  token: string;
  hasAccount: boolean;
};

export const AcceptInvitationForm: FC<AcceptInvitationFormProps> = ({ className, token, hasAccount }) => {
  const navigate = useNavigate();
  const [isAccepted, setIsAccepted] = useState(false);

  const acceptInvitationMutation = useMutation({
    mutationFn: userService.acceptInvitation,
    onSuccess: () => {
      toast.success("Convite aceito com sucesso.");
      setIsAccepted(true);
    },
    onError: requestErrorHandling,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    disabled: acceptInvitationMutation.isPending,
    defaultValues: { name: "", password: "", confirmPassword: "" },
  });

  const handleSubmit = (data: FormSchemaType) => {
    acceptInvitationMutation.mutate({
      body: { token, name: data.name, password: data.password },
    });
  };

  const handleAccept = () => {
    acceptInvitationMutation.mutate({ body: { token } });
  };

  if (isAccepted) {
    return (
      <div className={cn("flex w-full max-w-md flex-col items-center gap-4 text-center", className)}>
        <h1 className="text-2xl font-bold">Convite aceito</h1>
        <p className="text-muted-foreground text-sm">Sua conta foi vinculada com sucesso. Você já pode entrar.</p>
        <Button className="w-full" onClick={() => navigate("/auth/login")}>
          Ir para login
        </Button>
      </div>
    );
  }

  if (hasAccount) {
    return (
      <div className={cn("flex w-full max-w-md flex-col items-center gap-4 text-center", className)}>
        <h1 className="text-2xl font-bold">Aceitar convite</h1>
        <p className="text-muted-foreground text-sm text-balance">
          Você já possui uma conta. Confirme abaixo para vincular sua conta a este cliente.
        </p>
        <Button className="w-full" onClick={handleAccept} disabled={acceptInvitationMutation.isPending}>
          Aceitar convite
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Criar sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">Finalize seu cadastro para aceitar o convite</p>
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

          <Button type="submit" disabled={acceptInvitationMutation.isPending} className="w-full">
            Criar conta e aceitar convite
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
};
