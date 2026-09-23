import { useEffect, type FC } from "react";
import { UserContext } from "./userContext";
import { useQuery } from "@tanstack/react-query";
import { userService } from "@/services/api/userSevice.ts";
import { useLocalStorage, useSessionStorage } from "usehooks-ts";

type UserProviderProps = {
  children: React.ReactNode;
};

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useSessionStorage<User | null>("User", null);
  const [isLogged, setIsLogged] = useLocalStorage("isLogged", false);

  const isLogoutRoute = window.location.pathname.includes("/auth/logout");

  const getsMeQuery = useQuery({
    queryKey: ["me"],
    queryFn: userService.me,
    enabled: isLogged && !isLogoutRoute,
  });

  useEffect(() => {
    if (getsMeQuery?.data) {
      setUser(getsMeQuery.data);
    }
  }, [getsMeQuery.data, setUser]);

  function logout() {
    localStorage.clear();
    setIsLogged(false);
    setUser(null);
  }

  function login() {
    setIsLogged(true);
  }

  return <UserContext.Provider value={{ user, logout, isLogged, login }}>{children}</UserContext.Provider>;
};
