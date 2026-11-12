import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState, type FC } from "react";

const textareaClassName =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none";

export const StatusChip: FC<{ label: string; className: string }> = ({ label, className }) => (
  <span className={cn("inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium", className)}>{label}</span>
);

type ReasonDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel: string;
  isPending?: boolean;
  onConfirm: (reason: string | undefined) => void;
};

/** Pede um motivo opcional antes de recusar um passo ou o plano inteiro. */
export const ReasonDialog: FC<ReasonDialogProps> = (props) => (
  <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    <DialogContent className="sm:max-w-md">
      {/* Remonta a cada abertura para começar com o campo vazio */}
      {props.open && <ReasonForm {...props} />}
    </DialogContent>
  </Dialog>
);

const ReasonForm: FC<ReasonDialogProps> = ({ onOpenChange, title, description, confirmLabel, isPending, onConfirm }) => {
  const [reason, setReason] = useState("");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onConfirm(reason.trim() || undefined);
      }}
    >
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="assistant-reason">Motivo (opcional)</Label>
        <textarea
          id="assistant-reason"
          rows={3}
          maxLength={2000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Conte o porquê; o assistente usa isso para propor de outro jeito"
          className={cn(textareaClassName, "resize-y")}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" variant="destructive" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </form>
  );
};

type StepInputDialogProps = {
  step: AssistantStep | null;
  onOpenChange: (open: boolean) => void;
  isPending?: boolean;
  onSave: (input: Record<string, unknown>) => void;
};

/** Edição avançada da entrada de um passo pendente, em JSON; o back valida de novo. */
export const StepInputDialog: FC<StepInputDialogProps> = ({ step, ...props }) => (
  <Dialog open={!!step} onOpenChange={props.onOpenChange}>
    <DialogContent className="sm:max-w-2xl">{step && <StepInputForm key={step.id} step={step} {...props} />}</DialogContent>
  </Dialog>
);

const StepInputForm: FC<StepInputDialogProps & { step: AssistantStep }> = ({ step, onOpenChange, isPending, onSave }) => {
  const [text, setText] = useState(() => JSON.stringify(step.input ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="grid min-w-0 gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        try {
          const parsed: unknown = JSON.parse(text);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            setError("A entrada precisa ser um objeto entre chaves { }.");
            return;
          }
          setError(null);
          onSave(parsed as Record<string, unknown>);
        } catch {
          setError("O texto não é um JSON válido. Confira vírgulas, aspas e chaves.");
        }
      }}
    >
      <DialogHeader>
        <DialogTitle>Editar entrada</DialogTitle>
        <DialogDescription>
          Passo {step.position}: {step.title}. Para quem conhece o formato da ferramenta ({step.tool}). Ao salvar, a prévia é refeita.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="assistant-step-input">Entrada (JSON)</Label>
        <textarea
          id="assistant-step-input"
          rows={14}
          spellCheck={false}
          value={text}
          onChange={(event) => setText(event.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "assistant-step-input-error" : undefined}
          className={cn(textareaClassName, "resize-y font-mono text-xs")}
        />
        {error && (
          <p id="assistant-step-input-error" className="text-destructive text-sm">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar entrada
        </Button>
      </DialogFooter>
    </form>
  );
};
