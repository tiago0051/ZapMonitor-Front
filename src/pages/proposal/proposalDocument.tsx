import { type CSSProperties, type FC, type ReactNode } from "react";
import { billingSuffix, formatProposalDate, money } from "./proposalFormat";

/** Documento da proposta com a marca: o mesmo na página pública (com o aceite em `children`) e na prévia do painel. */
export const ProposalDocument: FC<{ proposal: ProposalView; children?: ReactNode }> = ({ proposal, children }) => {
  const accent = proposal.brand.accentColor;
  const billings = new Set(proposal.items.map((item) => item.billing));
  // Todos os itens com a mesma recorrência: o total também é por mês (ou ano)
  const totalSuffix = billings.size === 1 ? billingSuffix[[...billings][0]] : "";
  const customer = [proposal.customerName, proposal.customerCompany].filter(Boolean).join(" · ");

  return (
    <article
      className="bg-background text-foreground rounded-xl border p-5 shadow-sm sm:p-10"
      style={{ "--proposal-accent": accent } as CSSProperties}
    >
      <header className="mb-7 flex flex-col gap-4 border-b-[3px] border-(--proposal-accent) pb-5 sm:flex-row sm:items-start sm:justify-between">
        {proposal.brand.logoDataUri ? (
          <img src={proposal.brand.logoDataUri} alt={proposal.brand.name} className="max-h-14 max-w-[200px] object-contain" />
        ) : (
          <div className="text-lg font-bold">{proposal.brand.name}</div>
        )}
        <div className="text-muted-foreground text-xs sm:text-right">
          <strong className="text-foreground block text-base">Proposta nº {proposal.number}</strong>
          {formatProposalDate(proposal.createdAt)}
        </div>
      </header>

      <h1 className="mb-1 text-2xl leading-tight font-bold">{proposal.title}</h1>
      {customer && <p className="text-muted-foreground mb-7">Para {customer}</p>}

      {proposal.sections.map((section, index) => {
        if (section.kind !== "ITEMS" && !section.body.trim()) return null;
        return (
          <section key={index} className="mt-7">
            <h2 className="mb-2.5 text-sm font-semibold tracking-wide text-(--proposal-accent) uppercase">{section.title}</h2>
            {section.kind === "ITEMS" && (
              <>
                <ItemsTable items={proposal.items} total={proposal.total} totalSuffix={totalSuffix} />
                {proposal.paymentTerms && (
                  <p className="mb-2.5 text-sm">
                    <strong>Pagamento:</strong> {proposal.paymentTerms}
                  </p>
                )}
              </>
            )}
            {section.body && <SectionBody body={section.body} />}
          </section>
        );
      })}

      {proposal.validUntil && (
        <div className="bg-muted/60 mt-7 border-l-[3px] border-(--proposal-accent) px-4 py-3 text-sm">
          Proposta válida até <strong>{formatProposalDate(proposal.validUntil)}</strong>.
        </div>
      )}

      {proposal.terms && <footer className="text-muted-foreground mt-8 border-t pt-3 text-xs whitespace-pre-line">{proposal.terms}</footer>}

      {children}
    </article>
  );
};

const ItemsTable: FC<{ items: ProposalView["items"]; total: number; totalSuffix: string }> = ({ items, total, totalSuffix }) => {
  if (!items.length) return <p className="text-muted-foreground text-sm">Sem itens.</p>;
  return (
    <div className="mb-3 overflow-x-auto">
      <table className="w-full border-collapse text-sm tabular-nums">
        <thead>
          <tr className="text-muted-foreground border-b text-left text-[11px] tracking-wide uppercase">
            <th className="px-1.5 py-2 font-medium">Item</th>
            <th className="px-1.5 py-2 text-right font-medium">Qtd.</th>
            <th className="px-1.5 py-2 text-right font-medium">Preço</th>
            <th className="hidden px-1.5 py-2 text-right font-medium sm:table-cell">Desc.</th>
            <th className="px-1.5 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className="border-b align-top">
              <td className="px-1.5 py-2.5">
                <strong>{item.name}</strong>
                {item.description && <div className="text-muted-foreground text-xs">{item.description}</div>}
              </td>
              <td className="px-1.5 py-2.5 text-right">{item.quantity.toLocaleString("pt-BR")}</td>
              <td className="px-1.5 py-2.5 text-right whitespace-nowrap">
                {money(item.unitPrice)}
                {billingSuffix[item.billing]}
              </td>
              <td className="hidden px-1.5 py-2.5 text-right sm:table-cell">
                {item.discountPercent ? `${item.discountPercent.toLocaleString("pt-BR")}%` : "—"}
              </td>
              <td className="px-1.5 py-2.5 text-right whitespace-nowrap">
                {money(item.total)}
                {billingSuffix[item.billing]}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-foreground border-t-2 text-base font-bold">
            <td className="px-1.5 py-2.5" colSpan={2}>
              Total
            </td>
            <td className="px-1.5 py-2.5 text-right whitespace-nowrap" colSpan={3}>
              {money(total)}
              {totalSuffix}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

/** Texto da seção: parágrafos, tópicos com "- " e listas numeradas "1." (mesma regra do PDF). */
const SectionBody: FC<{ body: string }> = ({ body }) => {
  const blocks = body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return (
    <div className="space-y-2.5 leading-relaxed">
      {blocks.map((block, index) => {
        const lines = block
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        if (lines.every((line) => /^[-•*]\s+/.test(line)))
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{line.replace(/^[-•*]\s+/, "")}</li>
              ))}
            </ul>
          );
        if (lines.every((line) => /^\d+[.)]\s+/.test(line)))
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{line.replace(/^\d+[.)]\s+/, "")}</li>
              ))}
            </ol>
          );
        return (
          <p key={index} className="whitespace-pre-line">
            {lines.join("\n")}
          </p>
        );
      })}
    </div>
  );
};
