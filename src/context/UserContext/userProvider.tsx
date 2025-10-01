import { type FC } from "react";
import { useLocalStorage } from "usehooks-ts";
import { UserContext } from "./userContext";

type UserProviderProps = {
  children: React.ReactNode;
};

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useLocalStorage<User | null>("user", null);

  function logout() {
    setUser(null);
  }

  return <UserContext.Provider value={{ user, setUser, isAuthenticated: !!user, logout }}>{children}</UserContext.Provider>;
};
