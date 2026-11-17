import { useUserContext } from "@/context/UserContext/userContext";
import { userService } from "@/services/api/userSevice";
import { useLayoutEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { RETURN_TO_PARAM, withReturnTo } from "@/utils/returnTo";

export const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useUserContext();
  // Sessão vencida no meio do uso: o login volta para a tela em que a pessoa estava
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get(RETURN_TO_PARAM);

  useLayoutEffect(() => {
    const performLogout = async () => {
      try {
        await userService.logout();
      } catch (error) {
        console.error("Logout failed:", error);
      }

      logout();
      navigate(withReturnTo("/auth/login", returnTo), { replace: true });
    };
    performLogout();
  }, []);

  return <></>;
};
