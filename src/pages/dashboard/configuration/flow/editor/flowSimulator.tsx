import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, FastForward, Info, Loader2, RotateCcw, Send, Users, X } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";

type ChatItem = { id: number; kind: "contact"; text: string } | (FlowSimulationEvent & { id: number });

type Props = {
  clientId: string;
  flow: Flow;
  // Há alterações no editor que ainda não foram salvas: o simulador roda o rascunho salvo
  isDirty: boolean;
  onClose: () => void;
  // Destaca no canvas o nó em que a simulação está
  onCurrentNode: (nodeId: string | null) => void;
};

/**
 * Conversa de teste com o rascunho salvo, sem WhatsApp e sem gravar nada. Mensagens, perguntas e o agente de IA
 * respondem de verdade; categorias, CRM, fila e encerramento aparecem descritos.
 */
export const FlowSimulator: FC<Props> = ({ clientId, flow, isDirty, onClose, onCurrentNode }) => {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [result, setResult] = useState<FlowSimulationResult | null>(null);
  const [text, setText] = useState("");
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);
  // Em desenvolvimento o React monta o painel duas vezes; a simulação começa uma só
  const hasStarted = useRef(false);

  const push = (newItems: Omit<ChatItem, "id">[]) =>
    setItems((current) => [...current, ...newItems.map((item) => ({ ...item, id: nextId.current++ }) as ChatItem)]);

  const step = useMutation({
    mutationFn: (body: SimulateFlowRequestData["body"]) => flowService.simulate({ params: { clientId, flowId: flow.id }, body }),
    onError: requestErrorHandling,
    onSuccess: (stepResult) => {
      setResult(stepResult);
      push(stepResult.events);
      const isCurrentFlow = stepResult.state.flowId === flow.id;
      onCurrentNode(isCurrentFlow ? (stepResult.state.nodeId ?? stepResult.visitedNodeIds.at(-1) ?? null) : null);
    },
  });

  const restart = () => {
    setItems([]);
    setResult(null);
    onCurrentNode(null);
    step.mutate({ action: "start" });
  };

  const reply = (message: string) => {
    if (!result || !message.trim()) return;
    push([{ kind: "contact", text: message.trim() }]);
    setText("");
    step.mutate({ action: "reply", state: result.state, text: message.trim() });
  };

  // Começa ao abrir o painel
  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      step.mutate({ action: "start" });
    }
    return () => onCurrentNode(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [items, step.isPending]);

  const isFinished = !!result?.state.finished;
  const lastBot = [...items].reverse().find((item) => item.kind === "bot");
  const quickReplies = !isFinished && lastBot && "buttons" in lastBot ? (lastBot.buttons ?? []) : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Simular conversa</p>
          <p className="text-muted-foreground text-xs">Roda o rascunho salvo, sem WhatsApp e sem gravar nada</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Recomeçar a simulação"
          title="Recomeçar"
          disabled={step.isPending}
          onClick={restart}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Fechar o simulador" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {isDirty && (
        <p className="border-b bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Há alterações não salvas. Salve o rascunho e recomece para simular com elas.
        </p>
      )}

      <div className="bg-muted/30 min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {items.map((item) => {
          if (item.kind === "contact")
            return (
              <div key={item.id} className="flex justify-end">
                <p className="bg-primary text-primary-foreground max-w-[85%] rounded-lg rounded-br-sm px-3 py-2 text-sm whitespace-pre-wrap">
                  {item.text}
                </p>
              </div>
            );

          if (item.kind === "bot")
            return (
              <div key={item.id} className="flex flex-col items-start gap-1">
                <p className="bg-card max-w-[85%] rounded-lg rounded-bl-sm border px-3 py-2 text-sm whitespace-pre-wrap">{item.text}</p>
                {item.buttons && item.buttons.length > 0 && (
                  <div className="flex max-w-[85%] flex-wrap gap-1">
                    {item.buttons.map((button) => (
                      <span key={button} className="bg-card text-primary rounded-md border px-2 py-0.5 text-xs">
                        {button}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );

          const Icon = item.kind === "queue" ? Users : item.kind === "end" ? CheckCircle2 : Info;
          return (
            <p
              key={item.id}
              className={cn(
                "text-muted-foreground flex items-start gap-1.5 px-1 text-xs",
                item.kind !== "info" && "text-foreground font-medium",
              )}
            >
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {item.text}
                {item.flowId !== flow.id && <span className="text-muted-foreground"> · outro fluxo</span>}
              </span>
            </p>
          );
        })}
        {step.isPending && (
          <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Processando…
          </p>
        )}
        {isFinished && !step.isPending && (
          <p className="text-muted-foreground px-1 pt-2 text-xs">A simulação terminou. Recomece para testar outro caminho.</p>
        )}
        <div ref={endRef} />
      </div>

      {!isFinished && result && result.forwardOptions.length > 0 && (
        <div className="space-y-1 border-t p-3">
          <p className="text-muted-foreground text-xs">Simular o "Encaminhar" do atendente:</p>
          <div className="flex flex-wrap gap-1">
            {result.forwardOptions.map((output) => (
              <Button
                key={output.id}
                size="sm"
                variant="outline"
                disabled={step.isPending}
                onClick={() => step.mutate({ action: "forward", state: result.state, outputId: output.id })}
              >
                {output.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!isFinished && result?.canTick && (
        <div className="border-t px-3 pt-3">
          <Button
            size="sm"
            variant="outline"
            disabled={step.isPending}
            onClick={() => step.mutate({ action: "tick", state: result.state })}
          >
            <FastForward className="h-4 w-4" />
            Avançar o tempo
          </Button>
        </div>
      )}

      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t px-3 pt-3">
          {quickReplies.map((button) => (
            <Button key={button} size="sm" variant="secondary" disabled={step.isPending} onClick={() => reply(button)}>
              {button}
            </Button>
          ))}
        </div>
      )}

      <form
        className="flex gap-2 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          reply(text);
        }}
      >
        <Input
          id="flow-simulator-message"
          placeholder={isFinished ? "Simulação encerrada" : "Escreva como o contato"}
          value={text}
          disabled={isFinished || !result}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" size="icon" aria-label="Enviar" disabled={isFinished || !result || !text.trim() || step.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-muted-foreground px-3 pb-3 text-[11px]">O agente de IA e a pergunta no modo IA consomem a cota de IA.</p>
    </div>
  );
};
