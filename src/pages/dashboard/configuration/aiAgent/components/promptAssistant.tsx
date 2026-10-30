import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { aiAgentService } from "@/services/api/aiAgentService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { useState, type FC } from "react";
import { textareaClassName } from "../aiAgentConstants";

type PromptAssistantProps = {
  clientId: string;
  defaultObjective: string;
  currentPrompt: string;
  disabled?: boolean;
  onGenerated: (systemPrompt: string) => void;
};

export const PromptAssistant: FC<PromptAssistantProps> = ({ clientId, defaultObjective, currentPrompt, disabled, onGenerated }) => {
  const [objective, setObjective] = useState(defaultObjective);
  const [refinement, setRefinement] = useState("");
  const [previousPrompt, setPreviousPrompt] = useState<string | null>(null);

  const hasCurrentPrompt = currentPrompt.trim().length > 0;

  const generateSystemPrompt = useMutation({
    mutationFn: aiAgentService.generateSystemPrompt,
    onError: requestErrorHandling,
    onSuccess: ({ systemPrompt }) => {
      setPreviousPrompt(currentPrompt);
      setRefinement("");
      onGenerated(systemPrompt);
    },
  });

  const handleGenerate = (refine: boolean) => {
    generateSystemPrompt.mutate({
      params: { clientId },
      body: {
        objective,
        currentPrompt: refine ? currentPrompt : undefined,
        refinement: refine ? refinement : undefined,
      },
    });
  };

  const handleUndo = () => {
    if (previousPrompt === null) return;

    onGenerated(previousPrompt);
    setPreviousPrompt(null);
  };

  const isDisabled = disabled || generateSystemPrompt.isPending;
  const canGenerate = objective.trim().length > 0 && !isDisabled;

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500" />
        <h4 className="text-sm font-semibold">Assistente de prompt</h4>
      </div>
      <p className="text-muted-foreground text-xs">
        Descreva a empresa, o público, os assuntos que o agente resolve e o tom desejado. A IA escreve o system prompt para você revisar.
      </p>

      <div className="space-y-2">
        <Label htmlFor="prompt-assistant-objective">O que o agente deve fazer?</Label>
        <textarea
          id="prompt-assistant-objective"
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          disabled={isDisabled}
          maxLength={4000}
          placeholder="Ex.: Atender clientes da Maxcred interessados em empréstimo consignado, tirar dúvidas sobre taxas e prazos e coletar CPF e convênio antes de passar para um atendente."
          className={`${textareaClassName} min-h-28`}
        />
      </div>

      <Button type="button" variant="secondary" onClick={() => handleGenerate(false)} disabled={!canGenerate}>
        {generateSystemPrompt.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {hasCurrentPrompt ? "Gerar novo prompt" : "Gerar prompt"}
      </Button>

      {hasCurrentPrompt && (
        <div className="space-y-2 border-t pt-3">
          <Label htmlFor="prompt-assistant-refinement">Ajustar o prompt atual</Label>
          <textarea
            id="prompt-assistant-refinement"
            value={refinement}
            onChange={(e) => setRefinement(e.target.value)}
            disabled={isDisabled}
            maxLength={2000}
            placeholder="Ex.: Seja mais formal e nunca informe valores de parcelas."
            className={`${textareaClassName} min-h-16`}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => handleGenerate(true)}
            disabled={!canGenerate || refinement.trim().length === 0}
          >
            Refinar prompt atual
          </Button>
        </div>
      )}

      {previousPrompt !== null && (
        <Button type="button" variant="ghost" size="sm" onClick={handleUndo} disabled={isDisabled}>
          <Undo2 className="h-4 w-4" />
          Desfazer última geração
        </Button>
      )}
    </div>
  );
};
