import { useUserContext } from "@/context/UserContext/userContext";
import { userService } from "@/services/api/userSevice";
import { useLayoutEffect } from "react";
import { Navigate } from "react-router";

export const Logout = () => {
  const { logout } = useUserContext();

  useLayoutEffect(() => {
    const performLogout = async () => {
      try {
        await userService.logout();
      } catch (error) {
        console.error("Logout failed:", error);
      }
    };
    performLogout();
    logout();
  }, []);

  return <Navigate to={"/auth/login"} />;
};
