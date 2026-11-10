import { Link } from "react-router";
import type { FC, ReactNode } from "react";
import { COMPANY } from "./legalCompany";

export const LegalSection: FC<{ id: string; title: string; children: ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-6 space-y-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

/** Moldura das páginas legais públicas, com o link entre elas. */
export const LegalPage: FC<{ title: string; updatedAt: string; children: ReactNode }> = ({ title, updatedAt, children }) => (
  <div className="bg-background text-foreground min-h-svh">
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-[15px] leading-relaxed sm:py-16">
      <header className="space-y-2 border-b pb-6">
        <p className="text-muted-foreground text-sm font-medium">{COMPANY.product}</p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="text-muted-foreground text-sm">Última atualização: {updatedAt}</p>
      </header>

      {children}

      <footer className="text-muted-foreground flex flex-wrap gap-4 border-t pt-6 text-sm">
        <Link to="/privacidade" className="hover:text-foreground underline underline-offset-2">
          Política de Privacidade
        </Link>
        <Link to="/termos" className="hover:text-foreground underline underline-offset-2">
          Termos de Serviço
        </Link>
      </footer>
    </main>
  </div>
);
