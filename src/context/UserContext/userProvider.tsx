import { type FC } from "react";
import { UserContext } from "./userContext";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/api/userSevice.ts";

type UserProviderProps = {
  children: React.ReactNode;
};

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
  const getsMeQuery = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
    enabled: window.location.pathname !== "/auth/login"
  })

  const user = getsMeQuery?.data ?? null;

  function logout() {
    // setUser(null);
  }

  return <UserContext.Provider value={{ user, logout }}>{children}</UserContext.Provider>;
};
