import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useState, type FC } from "react";
import { END_SERVICE_ANNOTATION_MAX_LENGTH, SERVICE_OUTCOMES, type ServiceOutcome } from "../../../../serviceOutcome";

type EndServiceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  onConfirm: (body: EndWhatsappServiceRequestBody) => void;
};

const textareaClassName =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-base focus-visible:ring-1 focus-visible:outline-none md:text-sm";

/** Conteúdo do diálogo; montado só enquanto está aberto, então cada abertura começa limpa. */
const EndServiceForm: FC<Omit<EndServiceDialogProps, "open" | "onOpenChange">> = ({ contactName, onConfirm }) => {
  const [outcome, setOutcome] = useState<ServiceOutcome | null>(null);
  const [annotation, setAnnotation] = useState("");

  const confirm = () => onConfirm({ outcome: outcome ?? undefined, annotation: annotation.trim() || undefined });

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Encerrar atendimento?</AlertDialogTitle>
        <AlertDialogDescription>
          O atendimento de {contactName} será finalizado. O resultado e a anotação ficam no histórico do contato (aba Histórico, ao lado
          da conversa).
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="grid gap-3">
        <div className="grid gap-2">
          <span id="end-service-outcome" className="text-sm font-medium">
            Resultado (opcional)
          </span>
          <div role="radiogroup" aria-labelledby="end-service-outcome" className="flex flex-wrap gap-1.5">
            {SERVICE_OUTCOMES.map((item) => {
              const isSelected = outcome === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => setOutcome(isSelected ? null : item.value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted text-foreground",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="end-service-annotation">Anotação (opcional)</Label>
          <textarea
            id="end-service-annotation"
            rows={3}
            maxLength={END_SERVICE_ANNOTATION_MAX_LENGTH}
            value={annotation}
            onChange={(event) => setAnnotation(event.target.value)}
            onKeyDown={(event) => {
              // Ctrl/Cmd+Enter encerra sem tirar a mão do teclado
              if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                confirm();
              }
            }}
            placeholder="Ex.: pediu retorno na semana que vem"
            className={cn(textareaClassName, "resize-y")}
          />
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={confirm}>
          Encerrar
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  );
};

/** Confirmação do encerramento, com resultado (chips) e anotação livre que vão para o histórico de atendimentos. */
export const EndServiceDialog: FC<EndServiceDialogProps> = ({ open, onOpenChange, contactName, onConfirm }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <EndServiceForm
        contactName={contactName}
        onConfirm={(body) => {
          onConfirm(body);
          onOpenChange(false);
        }}
      />
    </AlertDialogContent>
  </AlertDialog>
);
