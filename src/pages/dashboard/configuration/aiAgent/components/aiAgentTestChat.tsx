import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiAgentService } from "@/services/api/aiAgentService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Info, Loader2, RotateCcw, Send, Wrench } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";

type ChatItem =
  | { id: number; kind: "contact" | "bot"; text: string }
  | { id: number; kind: "tool" | "info" | "finished"; text: string; detail?: string | null };

type Props = {
  clientId: string;
  // Agente salvo: o teste usa as ferramentas dele (agenda) e o que ele sabe
  aiAgentId?: string;
  systemPrompt: string;
  temperature: number;
};

// Mesmo limite de conversa que o back aceita
const MAX_MESSAGES = 40;

/**
 * Conversa de teste com as instruções que estão na tela, mesmo sem salvar. Nada vai para o WhatsApp: a agenda é
 * consultada de verdade, mas marcar, remarcar e desmarcar só aparecem descritos.
 */
export const AiAgentTestChat: FC<Props> = ({ clientId, aiAgentId, systemPrompt, temperature }) => {
  const [items, setItems] = useState<ChatItem[]>([]);
  const [text, setText] = useState("");
  const nextId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  const push = (newItems: Omit<ChatItem, "id">[]) =>
    setItems((current) => [...current, ...newItems.map((item) => ({ ...item, id: nextId.current++ }) as ChatItem)]);

  const test = useMutation({
    mutationFn: aiAgentService.test,
    onError: requestErrorHandling,
    onSuccess: (result) => {
      push([
        ...result.toolCalls.map((call) => ({ kind: "tool" as const, text: call.label, detail: call.detail })),
        ...result.simulatedActions.map((action) => ({ kind: "info" as const, text: `${action}. No teste nada é gravado na agenda.` })),
        ...(result.reply ? [{ kind: "bot" as const, text: result.reply }] : []),
        ...(result.finished
          ? [
              {
                kind: "finished" as const,
                text: "O agente daria esta etapa por concluída; no fluxo, o contato seguiria para a próxima etapa.",
              },
            ]
          : []),
      ]);
    },
  });

  const send = () => {
    const message = text.trim();
    if (!message || !systemPrompt.trim() || test.isPending) return;

    const history: AiAgentTestMessage[] = [
      ...items
        .filter((item) => item.kind === "contact" || item.kind === "bot")
        .map((item) => ({ role: item.kind as "contact" | "bot", text: item.text })),
      { role: "contact" as const, text: message },
    ].slice(-MAX_MESSAGES);

    push([{ kind: "contact", text: message }]);
    setText("");
    test.mutate({ params: { clientId }, body: { aiAgentId, systemPrompt, temperature, messages: history } });
  };

  const restart = () => {
    setItems([]);
    test.reset();
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [items, test.isPending]);

  const hasPrompt = systemPrompt.trim().length > 0;

  return (
    <div className="flex h-[min(70dvh,560px)] flex-col overflow-hidden rounded-lg border">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Testar agente</p>
          <p className="text-muted-foreground text-xs">Usa as instruções da tela, mesmo sem salvar. Nada vai para o WhatsApp.</p>
        </div>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Recomeçar o teste"
          title="Recomeçar"
          disabled={test.isPending || items.length === 0}
          onClick={restart}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-muted/30 min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {items.length === 0 && (
          <p className="text-muted-foreground px-1 text-sm">
            {hasPrompt
              ? "Escreva como se fosse um cliente no WhatsApp para ver como o agente responde."
              : "Escreva as instruções do agente antes de testar."}
          </p>
        )}

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
              <div key={item.id} className="flex justify-start">
                <p className="bg-card max-w-[85%] rounded-lg rounded-bl-sm border px-3 py-2 text-sm whitespace-pre-wrap">{item.text}</p>
              </div>
            );

          const Icon = item.kind === "tool" ? Wrench : item.kind === "finished" ? CheckCircle2 : Info;
          return (
            <p key={item.id} className="text-muted-foreground flex items-start gap-1.5 px-1 text-xs">
              <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {item.text}
                {"detail" in item && item.detail && <span> · {item.detail}</span>}
              </span>
            </p>
          );
        })}

        {test.isPending && (
          <p className="text-muted-foreground flex items-center gap-1.5 px-1 text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />O agente está respondendo…
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2 border-t p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <Input
          aria-label="Mensagem do contato"
          placeholder="Escreva como o contato"
          value={text}
          maxLength={4000}
          disabled={!hasPrompt}
          onChange={(event) => setText(event.target.value)}
        />
        <Button type="submit" size="icon" aria-label="Enviar" disabled={!hasPrompt || !text.trim() || test.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-muted-foreground px-3 pb-3 text-[11px]">Cada resposta do teste entra no consumo de IA do mês.</p>
    </div>
  );
};
