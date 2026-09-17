import { AcceptInvitationForm } from "@/components/accept-invitation-form";
import { userService } from "@/services/api/userSevice";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router";

export const AcceptInvitation = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";

  const checkInvitationQuery = useQuery({
    queryKey: ["checkInvitation", token],
    queryFn: () => userService.checkInvitation({ queries: { token } }),
    enabled: !!token,
  });

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Convite inválido</h1>
        <p className="text-muted-foreground text-sm">O link do convite não contém um token válido.</p>
        <Link to="/auth/login" className="text-sm underline underline-offset-4">
          Ir para login
        </Link>
      </div>
    );
  }

  if (checkInvitationQuery.isLoading) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <p className="text-muted-foreground text-sm">Verificando convite...</p>
      </div>
    );
  }

  if (checkInvitationQuery.isError || !checkInvitationQuery.data?.valid) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Convite inválido ou expirado</h1>
        <p className="text-muted-foreground text-sm">Solicite um novo convite ao administrador do cliente.</p>
        <Link to="/auth/login" className="text-sm underline underline-offset-4">
          Ir para login
        </Link>
      </div>
    );
  }

  return <AcceptInvitationForm token={token} hasAccount={!!checkInvitationQuery.data.hasAccount} />;
};
