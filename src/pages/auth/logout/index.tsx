import { useUserContext } from "@/context/UserContext/userContext";
import { userService } from "@/services/api/userSevice";
import { useLayoutEffect } from "react";
import { useNavigate } from "react-router";

export const Logout = () => {
  const navigate = useNavigate();
  const { logout } = useUserContext();

  useLayoutEffect(() => {
    const performLogout = async () => {
      try {
        await userService.logout();
      } catch (error) {
        console.error("Logout failed:", error);
      }

      logout();
      navigate("/auth/login");
    };
    performLogout();
  }, []);

  return <></>;
};
