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
import { useState } from "react";

const FormSchema = z.object({
  email: z.email("E-mail inválido"),
});

type FormSchemaType = z.infer<typeof FormSchema>;

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<"form">) {
  const [hasSentEmail, setHasSentEmail] = useState(false);

  const forgotPasswordMutation = useMutation({
    mutationFn: userService.forgotPassword,
    onSuccess: () => {
      setHasSentEmail(true);
    },
    onError: requestErrorHandling,
  });

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    disabled: forgotPasswordMutation.isPending,
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = (data: FormSchemaType) => {
    forgotPasswordMutation.mutate({
      body: {
        email: data.email,
      },
    });
  };

  return (
    <Form {...form}>
      <form className={cn("flex flex-col gap-6", className)} onSubmit={form.handleSubmit(handleSubmit)} {...props}>
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">Recuperar senha</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Digite seu e-mail para receber instrucoes de redefinicao de senha
          </p>
        </div>

        {hasSentEmail && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            Se existir uma conta com este e-mail, voce recebera um link de redefinicao em alguns minutos.
          </p>
        )}

        <div className="grid gap-4">
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

          <Button type="submit" disabled={forgotPasswordMutation.isPending} className="w-full">
            Enviar link de recuperacao
          </Button>
        </div>

        <div className="text-center text-sm">
          Lembrou da senha?{" "}
          <Link to="/auth/login" className="underline underline-offset-4">
            Voltar ao login
          </Link>
        </div>
      </form>
    </Form>
  );
}
