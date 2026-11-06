import { Button } from "@/components/ui/button";
import { CalendarX2 } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";

/** O plano do tenant venceu: só o acesso dos usuários está bloqueado; o atendimento automático continua. */
export const PlanExpiredScreen: FC = () => (
  <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
    <CalendarX2 className="text-muted-foreground h-10 w-10" />
    <div className="space-y-2">
      <h1 className="text-xl font-semibold">O plano deste cliente venceu</h1>
      <p className="text-muted-foreground text-sm">
        O acesso dos usuários está bloqueado até a renovação. As mensagens dos contatos continuam chegando e o atendimento automático segue
        funcionando, mas ninguém consegue responder por aqui.
      </p>
      <p className="text-muted-foreground text-sm">Fale com o implantador responsável pelo seu cliente para renovar.</p>
    </div>
    <Button variant="outline" asChild>
      <Link to="/auth/select_client">Ir para meus clientes</Link>
    </Button>
  </div>
);
