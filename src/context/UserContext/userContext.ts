import { createContext, useContext } from "react";

type UserContextProps = {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
};

export const UserContext = createContext({} as UserContextProps);

export const useUserContext = () => useContext(UserContext);
