import type { FC } from "react";
import { UserProvider } from "./context/UserContext/userProvider";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SocketProvider } from "./context/SocketContext/socketProvider";

type ProvidersProps = {
  children: React.ReactNode;
};

const queryClient = new QueryClient();

export const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <UserProvider>{children}</UserProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
};
