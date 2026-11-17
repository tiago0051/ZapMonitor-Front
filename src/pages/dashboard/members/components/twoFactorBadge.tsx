import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

/** Pessoa com a verificação em duas etapas ativa. */
export const TwoFactorBadge = () => (
  <Badge variant="secondary" className="gap-1" title="Verificação em duas etapas ativa">
    <ShieldCheck className="h-3 w-3" />
    Duas etapas
  </Badge>
);
