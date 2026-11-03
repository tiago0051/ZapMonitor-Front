import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";
import { Link, useParams } from "react-router";

/** Endereço que não existe; volta para o início do cliente aberto ou para a lista de clientes. */
export const NotFound = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const homeUrl = clientId ? `/dashboard/client/${clientId}` : "/auth/select_client";

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
        <FileQuestion className="text-muted-foreground h-6 w-6" />
      </div>
      <h2 className="text-lg font-semibold">Página não encontrada</h2>
      <p className="text-muted-foreground max-w-sm text-sm">O endereço acessado não existe ou foi alterado.</p>
      <Button asChild className="mt-2">
        <Link to={homeUrl}>{clientId ? "Voltar para o início" : "Ir para meus clientes"}</Link>
      </Button>
    </div>
  );
};
