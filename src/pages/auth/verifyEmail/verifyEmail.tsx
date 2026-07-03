import { Button } from "@/components/ui/button";
import { userService } from "@/services/api/userSevice";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const verifyEmailMutation = useMutation({
    mutationFn: userService.verifyEmail,
  });

  useEffect(() => {
    if (!token || verifyEmailMutation.isSuccess || verifyEmailMutation.isPending) return;

    verifyEmailMutation.mutate({
      body: {
        token,
      },
    });
  }, [token, verifyEmailMutation]);

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Token nao informado</h1>
        <p className="text-muted-foreground text-sm">O link de verificacao nao contem um token valido.</p>
        <Link to="/auth/login" className="text-sm underline underline-offset-4">
          Ir para login
        </Link>
      </div>
    );
  }

  const errorMessage =
    isAxiosError(verifyEmailMutation.error) && verifyEmailMutation.error.response?.data?.message
      ? verifyEmailMutation.error.response.data.message
      : "Nao foi possivel verificar o e-mail. Solicite um novo link.";

  return (
    <div className="w-full max-w-md space-y-4 text-center">
      <h1 className="text-2xl font-bold">Verificacao de e-mail</h1>

      {verifyEmailMutation.isPending && <p className="text-muted-foreground text-sm">Validando seu token...</p>}

      {verifyEmailMutation.isSuccess && (
        <>
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-700">
            E-mail verificado com sucesso. Agora voce ja pode fazer login.
          </p>
          <Button asChild className="w-full">
            <Link to="/auth/login">Ir para login</Link>
          </Button>
        </>
      )}

      {verifyEmailMutation.isError && (
        <>
          <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-700">{errorMessage}</p>
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              verifyEmailMutation.mutate({
                body: {
                  token,
                },
              })
            }
          >
            Tentar novamente
          </Button>
          <Link to="/auth/login" className="block text-sm underline underline-offset-4">
            Voltar ao login
          </Link>
        </>
      )}
    </div>
  );
};
