import { LoginForm } from "@/components/login-form";
import { useNavigate } from "react-router";

export const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <a
            href="https://zapmonitor.devsoftbr.com"
            className="text-2xl font-bold text-white bg-slate-600 p-2 rounded-sm"
          >
            Zap<span className="text-primary">Monitor</span>
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm onLoginSuccess={() => navigate("/dashboard")} />
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <img
          src="/assets/login/sideImage.jpg"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
    </div>
  );
};
