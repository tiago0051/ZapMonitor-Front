import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, ChevronDown, Circle, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { GuideStep } from "./gettingStartedSteps";

type GuideStepWithStatus = GuideStep & { done: boolean };

export const GettingStarted = ({ steps, onHide }: { steps: GuideStepWithStatus[]; onHide: () => void }) => {
  const baseUrl = useBaseUrl();
  const doneCount = steps.filter((step) => step.done).length;
  const currentStep = steps.find((step) => !step.done);
  const [openStepId, setOpenStepId] = useState<string | null>(currentStep?.id ?? null);

  if (!currentStep) return null;

  return (
    <section aria-labelledby="getting-started" className="bg-card overflow-hidden rounded-xl border shadow-xs">
      <div className="flex items-start justify-between gap-3 border-b p-4 md:p-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <h2 id="getting-started" className="text-lg font-semibold">
              Comece por aqui
            </h2>
            <p className="text-muted-foreground text-sm">
              Um passo a passo para deixar tudo pronto. {doneCount} de {steps.length} concluídos.
            </p>
          </div>
          <Progress
            value={(doneCount / steps.length) * 100}
            className="h-1.5 max-w-md"
            aria-label={`${doneCount} de ${steps.length} passos concluídos`}
          />
        </div>
        <Button variant="ghost" size="sm" className="text-muted-foreground -mt-1 shrink-0" onClick={onHide}>
          <X className="h-4 w-4" />
          <span className="hidden sm:inline">Ocultar guia</span>
          <span className="sr-only sm:hidden">Ocultar guia</span>
        </Button>
      </div>

      <ol className="divide-y">
        {steps.map((step, index) => {
          const isOpen = openStepId === step.id;
          const isCurrent = step.id === currentStep.id;

          return (
            <li key={step.id} className={cn(isCurrent && "bg-primary/5")}>
              <button
                type="button"
                onClick={() => setOpenStepId(isOpen ? null : step.id)}
                aria-expanded={isOpen}
                className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors md:px-5"
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                ) : isCurrent ? (
                  <span className="bg-primary text-primary-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                    {index + 1}
                  </span>
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                    {step.title}
                    <span className="sr-only">{step.done ? " (concluído)" : isCurrent ? " (próximo passo)" : " (pendente)"}</span>
                  </span>
                  {!isOpen && !step.done && <span className="text-muted-foreground block truncate text-xs">{step.description}</span>}
                </span>
                {isCurrent && !isOpen && <span className="text-primary hidden shrink-0 text-xs font-medium sm:inline">Próximo passo</span>}
                <ChevronDown
                  className={cn("text-muted-foreground h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")}
                  aria-hidden
                />
              </button>

              {isOpen && (
                <div className="space-y-3 px-4 pb-4 pl-12 md:px-5 md:pl-13">
                  <p className="text-sm">{step.description}</p>
                  <p className="text-muted-foreground text-sm">{step.why}</p>
                  <Button asChild size="sm" variant={step.done ? "outline" : "default"}>
                    <Link to={`${baseUrl}/${step.url}`}>
                      {step.done ? "Ver de novo" : step.action}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
