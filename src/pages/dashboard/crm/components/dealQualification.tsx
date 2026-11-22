import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, CircleDashed, Handshake, XCircle } from "lucide-react";
import { useState, type FC } from "react";

const statusInfo: Record<QualificationStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  MET: { label: "Atende", icon: CheckCircle2, className: "text-green-600 dark:text-green-400" },
  NOT_MET: { label: "Não atende", icon: XCircle, className: "text-red-600 dark:text-red-400" },
  UNKNOWN: { label: "Falta descobrir", icon: CircleDashed, className: "text-muted-foreground" },
};

/** Selo "qualificado" ou "ainda não" com a nota de peso atendido. */
export const QualificationBadge: FC<{ qualification: QualificationResult }> = ({ qualification }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
      qualification.qualified
        ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    )}
  >
    {qualification.qualified ? "Lead qualificado" : "Ainda não qualificado"} · {qualification.score}%
  </span>
);

/** Critérios da oferta com o que a IA viu na conversa; a conta (obrigatórios e nota mínima) é do sistema. */
export const QualificationChecklist: FC<{ qualification: QualificationResult }> = ({ qualification }) => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">Qualificação para {qualification.offerName}</p>
      <QualificationBadge qualification={qualification} />
    </div>
    <ul className="space-y-1.5">
      {qualification.checks.map((check) => {
        const info = statusInfo[check.status];
        const Icon = info.icon;
        return (
          <li key={check.id} className="flex gap-2 text-sm">
            <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", info.className)} aria-label={info.label} />
            <span className="min-w-0">
              {check.label}
              {check.evidence && <span className="text-muted-foreground block text-xs">"{check.evidence}"</span>}
            </span>
          </li>
        );
      })}
    </ul>
    <p className="text-muted-foreground text-xs">Precisa de todos os obrigatórios e {qualification.minScore}% do peso.</p>
  </div>
);

type HandoffProps = {
  summary: DealHandoffSummary;
  // No painel da conversa começa recolhido: só a recomendação aparece
  compact?: boolean;
};

/** Resumo que o agente de IA deixou ao passar a conversa para um atendente. */
export const DealHandoffCard: FC<HandoffProps> = ({ summary, compact = false }) => {
  const [isOpen, setIsOpen] = useState(!compact);

  return (
    <section className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900 dark:bg-sky-950/30">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <Handshake className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
          Passagem da IA · {summary.outputLabel}
        </p>
        {summary.qualification && <QualificationBadge qualification={summary.qualification} />}
      </div>

      {summary.recommendation && (
        <p className="text-sm">
          <span className="font-medium">Como seguir: </span>
          {summary.recommendation}
        </p>
      )}

      {isOpen ? (
        <div className="space-y-2">
          {summary.summary && <p className="text-sm">{summary.summary}</p>}
          {summary.discovered.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs">O que já se sabe</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {summary.discovered.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.objections.length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs">Objeções</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm">
                {summary.objections.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {summary.qualification && <QualificationChecklist qualification={summary.qualification} />}
          {compact && (
            <button
              type="button"
              className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300"
              onClick={() => setIsOpen(false)}
            >
              Ver menos
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-300"
          onClick={() => setIsOpen(true)}
        >
          Ver resumo completo
        </button>
      )}

      <p className="text-muted-foreground text-xs">{formatDistanceToNow(new Date(summary.createdAt), { locale: ptBR, addSuffix: true })}</p>
    </section>
  );
};
