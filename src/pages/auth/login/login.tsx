import { LoginForm } from "@/components/login-form";
import { RETURN_TO_PARAM, withReturnTo } from "@/utils/returnTo";
import { useNavigate, useSearchParams } from "react-router";

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // A escolha de cliente confere o acesso e segue direto para a tela guardada, quando houver uma
  const redirectTo = withReturnTo("/auth/select_client", searchParams.get(RETURN_TO_PARAM));

  return <LoginForm redirectTo={redirectTo} onLoginSuccess={() => navigate(redirectTo)} />;
};
