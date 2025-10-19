import { LoginForm } from "@/components/login-form";
import { useNavigate } from "react-router";

export const Login = () => {
  const navigate = useNavigate();

  return <LoginForm onLoginSuccess={() => navigate("/dashboard")} />;
};
