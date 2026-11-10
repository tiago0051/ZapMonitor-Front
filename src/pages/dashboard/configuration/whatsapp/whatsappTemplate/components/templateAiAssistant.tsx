import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { templateCategoryInfo } from "@/components/whatsappTemplate/templateDraftUtils";
import { cn } from "@/lib/utils";
import { templateService } from "@/services/api/templateService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Info, Loader2, ShieldCheck, Sparkles, Undo2, XCircle } from "lucide-react";
import { useState, type FC } from "react";

export const textareaClassName =
  "border-input dark:bg-input/30 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

type TemplateAiGeneratorProps = {
  clientId: string;
  draft: WhatsappTemplateDraft;
  hasContent: boolean;
  disabled?: boolean;
  onGenerated: (result: WhatsappTemplateAssistResult) => void;
  onUndo?: () => void;
};

/** "Escrever com IA": a pessoa descreve a mensagem e a IA monta o modelo inteiro, já na categoria certa. */
export const TemplateAiGenerator: FC<TemplateAiGeneratorProps> = ({ clientId, draft, hasContent, disabled, onGenerated, onUndo }) => {
  const [objective, setObjective] = useState("");
  const [refinement, setRefinement] = useState("");

  const generate = useMutation({
    mutationFn: templateService.assist,
    onError: requestErrorHandling,
    onSuccess: (result) => {
      setRefinement("");
      onGenerated(result);
    },
  });

  const run = (refine: boolean) =>
    generate.mutate({
      params: { clientId },
      body: {
        mode: "generate",
        objective: objective.trim() || "Melhorar o modelo atual",
        refinement: refine ? refinement.trim() : undefined,
        draft: refine ? draft : undefined,
        language: draft.language,
      },
    });

  const busy = disabled || generate.isPending;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900/60 dark:bg-violet-950/20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <h3 className="text-sm font-semibold">Escrever com IA</h3>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="template-ai-objective">O que a mensagem precisa dizer?</Label>
        <textarea
          id="template-ai-objective"
          rows={3}
          value={objective}
          disabled={busy}
          onChange={(event) => setObjective(event.target.value)}
          className={textareaClassName}
          placeholder="Ex.: lembrar o cliente que a parcela do empréstimo vence em 3 dias, com o valor e um botão para falar com o atendente"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || !objective.trim()} onClick={() => run(false)}>
          {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generate.isPending ? "Escrevendo..." : "Gerar modelo"}
        </Button>
        {onUndo && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onUndo}>
            <Undo2 className="h-4 w-4" />
            Desfazer
          </Button>
        )}
      </div>

      {hasContent && (
        <div className="grid gap-2 border-t pt-3">
          <Label htmlFor="template-ai-refinement">Ajustar o modelo atual</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="template-ai-refinement"
              value={refinement}
              disabled={busy}
              onChange={(event) => setRefinement(event.target.value)}
              placeholder="Ex.: mais curto, tom mais próximo, adicionar botão de resposta"
              className={cn(textareaClassName, "h-9 py-1")}
            />
            <Button type="button" size="sm" variant="outline" disabled={busy || !refinement.trim()} onClick={() => run(true)}>
              Ajustar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const severityInfo = {
  error: { icon: XCircle, className: "text-red-600 dark:text-red-400", label: "Recusa" },
  warning: { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400", label: "Risco" },
  tip: { icon: Info, className: "text-sky-600 dark:text-sky-400", label: "Dica" },
} as const;

const riskInfo = {
  low: { label: "Risco de reprovação baixo", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  medium: { label: "Risco de reprovação médio", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  high: { label: "Risco de reprovação alto", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
} as const;

const confidenceLabel = { high: "alta", medium: "média", low: "baixa" } as const;

type TemplateAiReviewProps = {
  draft: WhatsappTemplateDraft;
  result: WhatsappTemplateAssistResult | null;
  outdated: boolean;
  isPending: boolean;
  disabled?: boolean;
  onReview: () => void;
  onUseCategory: (category: WhatsappTemplateCategory) => void;
  onApplySuggestion: () => void;
};

/** "Revisar com IA": confere se a categoria escolhida é a que a Meta vai aplicar e o que pode reprovar o modelo. */
export const TemplateAiReview: FC<TemplateAiReviewProps> = ({
  draft,
  result,
  outdated,
  isPending,
  disabled,
  onReview,
  onUseCategory,
  onApplySuggestion,
}) => {
  const categoryMatches = result?.category === draft.category;

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Revisão da IA</h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant={result && !outdated ? "outline" : "default"}
          disabled={disabled || isPending}
          onClick={onReview}
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isPending ? "Revisando..." : result ? "Revisar de novo" : "Revisar com IA"}
        </Button>
      </div>

      {!result && !isPending && (
        <p className="text-muted-foreground text-sm">
          A IA confere se o conteúdo é mesmo de {templateCategoryInfo[draft.category].label.toLowerCase()} e aponta o que costuma levar a
          Meta a recusar ou reclassificar o modelo.
        </p>
      )}

      {result && (
        <div className={cn("grid gap-3", outdated && "opacity-60")}>
          {outdated && <p className="text-muted-foreground text-xs">O modelo mudou desde a revisão. Revise de novo antes de enviar.</p>}

          <div
            className={cn(
              "rounded-md border p-3 text-sm",
              categoryMatches
                ? "border-green-200 bg-green-50/60 dark:border-green-900/60 dark:bg-green-950/20"
                : "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20",
            )}
          >
            <div className="flex items-start gap-2">
              {categoryMatches ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div className="grid min-w-0 gap-1">
                <p className="font-medium">
                  {categoryMatches
                    ? `Categoria correta: ${templateCategoryInfo[result.category].label}`
                    : `A Meta deve classificar como ${templateCategoryInfo[result.category].label}, não ${templateCategoryInfo[draft.category].label}`}
                  <span className="text-muted-foreground font-normal"> · confiança {confidenceLabel[result.confidence]}</span>
                </p>
                <p className="text-muted-foreground">{result.categoryReason}</p>
                {!categoryMatches && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" disabled={disabled} onClick={() => onUseCategory(result.category)}>
                      Usar {templateCategoryInfo[result.category].label}
                    </Button>
                    {result.suggestion.category === draft.category && (
                      <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onApplySuggestion}>
                        Ajustar texto para continuar em {templateCategoryInfo[draft.category].label}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className={cn("rounded px-1.5 py-0.5", riskInfo[result.rejectionRisk].className)}>
              {riskInfo[result.rejectionRisk].label}
            </span>
            {result.summary && <span className="text-muted-foreground font-normal">{result.summary}</span>}
          </div>

          {result.issues.length > 0 && (
            <ul className="grid gap-2">
              {result.issues.map((issue, index) => {
                const info = severityInfo[issue.severity];
                const Icon = info.icon;
                return (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", info.className)} aria-label={info.label} />
                    <span>{issue.message}</span>
                  </li>
                );
              })}
            </ul>
          )}

          <Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={onApplySuggestion}>
            <Sparkles className="h-4 w-4" />
            Aplicar versão sugerida pela IA
          </Button>
          {result.suggestionErrors.length > 0 && (
            <p className="text-muted-foreground text-xs">
              A versão sugerida ainda precisa de ajustes: {result.suggestionErrors.join("; ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
