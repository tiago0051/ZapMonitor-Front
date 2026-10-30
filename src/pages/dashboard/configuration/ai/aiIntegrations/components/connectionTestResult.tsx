import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";
import type { FC } from "react";
import { translateAiIntegrationError } from "../aiIntegrationUtils";

type ConnectionTestResultProps = {
  status: "idle" | "pending" | "success" | "error";
  error: unknown;
  clientEmail?: string;
};

export const ConnectionTestResult: FC<ConnectionTestResultProps> = ({ status, error, clientEmail }) => {
  if (status === "idle") return null;

  if (status === "pending") {
    return (
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <LoaderCircle className="size-4 animate-spin" />
        Testando conexão...
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CircleCheck className="size-4" />
        Conexão realizada com sucesso.
      </div>
    );
  }

  const { message, detail } = translateAiIntegrationError(error, { clientEmail });

  return (
    <div className="border-destructive/40 bg-destructive/10 flex gap-2 rounded-md border p-3 text-sm">
      <CircleX className="text-destructive mt-0.5 size-4 shrink-0" />
      <div>
        <p className="text-destructive">{message}</p>
        {detail && <p className="text-muted-foreground mt-1 text-xs break-all">{detail}</p>}
      </div>
    </div>
  );
};
