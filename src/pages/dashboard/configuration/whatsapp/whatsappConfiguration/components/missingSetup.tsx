import { AlertTriangle } from "lucide-react";

// Aviso de configuração faltando, com o texto também para leitor de tela
export const MissingSetup = ({ label, hint }: { label: string; hint: string }) => (
  <span className="inline-flex items-center gap-1 text-sm text-amber-700 dark:text-amber-400" title={hint}>
    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
    {label}
  </span>
);
