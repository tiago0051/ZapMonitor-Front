import { RegisterForm } from "@/components/register-form";
import { useNavigate } from "react-router";

export const Register = () => {
  const navigate = useNavigate();

  return <RegisterForm onRegisterSuccess={() => navigate("/auth/login")} />;
};
