import { createContext, useContext } from "react";

type UserContextProps = {
  user: User | null;
  logout: () => void;
};

export const UserContext = createContext({} as UserContextProps);

export const useUserContext = () => useContext(UserContext);
