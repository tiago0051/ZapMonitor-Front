import type { LucideIcon } from "lucide-react";
import type { FC, ReactNode } from "react";

/** Cartão centralizado das páginas públicas curtas (descadastro, link indisponível). */
export const PublicMessage: FC<{ icon: LucideIcon; title: string; children: ReactNode }> = ({ icon: Icon, title, children }) => (
  <div className="bg-muted/40 grid min-h-dvh place-items-center px-4 py-8">
    <main className="bg-background w-full max-w-md rounded-xl border p-8 text-center shadow-sm">
      <Icon className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
      <h1 className="mb-3 text-lg font-semibold">{title}</h1>
      <div className="text-muted-foreground text-sm leading-relaxed">{children}</div>
    </main>
  </div>
);
