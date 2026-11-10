import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useEffect, useState, type FC } from "react";

type SteppedProgressProps = {
  /** Mostra e avança as etapas enquanto verdadeiro */
  active: boolean;
  steps: string[];
  /** Tempo em cada etapa, em ms; a última fica até terminar */
  interval?: number;
  className?: string;
};

/**
 * Mensagem que avança por etapas enquanto uma ação longa da IA roda, para a pessoa ver que algo está acontecendo.
 * As etapas são ilustrativas (o servidor não informa o andamento); a última fica parada até a resposta chegar.
 */
export const SteppedProgress: FC<SteppedProgressProps> = ({ active, ...props }) =>
  // Monta só enquanto roda: cada execução começa da primeira etapa
  active ? <Steps {...props} /> : null;

const Steps: FC<Omit<SteppedProgressProps, "active">> = ({ steps, interval = 6000, className }) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setStep((value) => Math.min(value + 1, steps.length - 1)), interval);
    return () => window.clearInterval(timer);
  }, [interval, steps.length]);

  return (
    <div role="status" aria-live="polite" className={cn("space-y-1.5", className)}>
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        {steps[step]}
      </p>
      <div className="flex max-w-sm gap-1" aria-hidden>
        {steps.map((label, index) => (
          <span key={label} className={cn("h-1 flex-1 rounded-full transition-colors", index <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <p className="text-muted-foreground text-xs">
        Etapa {step + 1} de {steps.length} · pode levar até um minuto.
      </p>
    </div>
  );
};
