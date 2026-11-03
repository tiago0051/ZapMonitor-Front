import type { FC } from "react";
import { UserProvider } from "./context/UserContext/userProvider";
import { QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";

type ProvidersProps = {
  children: React.ReactNode;
};

declare module "@tanstack/react-query" {
  interface Register {
    // Consultas que já mostram o erro na própria tela não disparam o aviso global
    queryMeta: { errorHandledInline?: boolean };
  }
}

// Sessão expirada é tratada pelo interceptor do axios; falta de permissão a tela já esconde
const ignoredStatuses = [401, 403];

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.errorHandledInline) return;
      if (isAxiosError(error) && ignoredStatuses.includes(error.response?.status ?? 0)) return;

      const message = isAxiosError(error) ? error.response?.data?.message : undefined;

      // O id agrupa falhas repetidas da mesma consulta em um único aviso
      toast.error("Não foi possível carregar algumas informações", {
        id: query.queryHash,
        description: typeof message === "string" ? message : "Verifique sua conexão e recarregue a página.",
      });
    },
  }),
});

export const Providers: FC<ProvidersProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>{children}</UserProvider>
    </QueryClientProvider>
  );
};
