import { ResetPasswordForm } from "@/components/reset-password-form";
import { Link, useNavigate, useSearchParams } from "react-router";

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get("token") || "";

  if (!token) {
    return (
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-bold">Link invalido</h1>
        <p className="text-muted-foreground text-sm">O token de redefinicao nao foi informado ou e invalido.</p>
        <Link to="/auth/forgot-password" className="text-sm underline underline-offset-4">
          Solicitar novo link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} onResetSuccess={() => navigate("/auth/login")} />;
};
