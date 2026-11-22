import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { salesScriptService } from "@/services/api/salesScriptService";
import { attendantDisplayName } from "@/utils/attendantName";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CornerDownLeft, Loader2, Sparkles } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { contactDisplayName } from "../../contactDisplayName";
import { insertIntoDraft } from "../../conversationDrafts";
import { fillQuickReply } from "../../quickReplies/quickReplies";
import { selectClassName } from "@/pages/dashboard/offers/offerUtils";

const STORAGE_KEY = "whatsapp:salesScript";

const readStoredScript = (clientId: string) => {
  try {
    return localStorage.getItem(`${STORAGE_KEY}:${clientId}`);
  } catch {
    return null;
  }
};

const storeScript = (clientId: string, id: string) => {
  try {
    localStorage.setItem(`${STORAGE_KEY}:${clientId}`, id);
  } catch {
    // Sem localStorage: a escolha vale só nesta tela
  }
};

/**
 * Roteiro de vendas ao lado da conversa: as etapas com falas prontas para inserir na caixa de mensagem e, sob demanda, a
 * IA diz em que etapa a conversa está e sugere a próxima mensagem. Nada é enviado sem o atendente.
 */
export const ConversationScript: FC<{ contact: WhatsappContactMessage }> = ({ contact }) => {
  const { client, can } = useClientContext();
  const { user } = useUserContext();
  const baseUrl = useBaseUrl();
  const [scriptId, setScriptId] = useState<string | null>(() => readStoredScript(client.id));
  const [openStage, setOpenStage] = useState<string | null>(null);

  const scriptsQuery = useQuery({
    queryKey: ["salesScripts", client.id, false],
    queryFn: () => salesScriptService.findAll(client.id),
  });
  const scripts = scriptsQuery.data ?? [];
  // Prefere o escolhido antes; senão o primeiro roteiro de WhatsApp
  const script = scripts.find((item) => item.id === scriptId) ?? scripts.find((item) => item.channel === "WHATSAPP") ?? scripts[0];

  const coach = useMutation({
    mutationFn: () => salesScriptService.coach(client.id, script!.id, contact.id),
    onError: requestErrorHandling,
    onSuccess: (result) => setOpenStage(result.stageKey),
  });
  // A sugestão vale para a conversa e o roteiro em que foi pedida
  const [coachFor, setCoachFor] = useState<string | null>(null);
  const coachKey = `${contact.id}:${script?.id}`;
  const coachResult = coachFor === coachKey ? coach.data : undefined;

  const fill = (text: string) =>
    fillQuickReply(text, { contactName: contactDisplayName(contact, ""), attendantName: attendantDisplayName(user) });
  const insert = (text: string) => insertIntoDraft(contact.id, fill(text));

  if (scriptsQuery.isLoading)
    return (
      <p role="status" className="text-muted-foreground flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando roteiros...
      </p>
    );

  if (!script)
    return (
      <div className="text-muted-foreground space-y-2 text-sm">
        <p>Nenhum roteiro de vendas cadastrado.</p>
        {can("offers.manage") && (
          <Link className="text-primary underline-offset-4 hover:underline" to={`${baseUrl}/offers?tab=scripts`}>
            Criar um roteiro com a IA
          </Link>
        )}
      </div>
    );

  const currentKey = coachResult?.stageKey ?? null;

  return (
    <div className="space-y-4">
      {scripts.length > 1 && (
        <select
          id="conversation-script"
          aria-label="Roteiro"
          className={selectClassName}
          value={script.id}
          onChange={(event) => {
            setScriptId(event.target.value);
            storeScript(client.id, event.target.value);
          }}
        >
          {scripts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      )}

      <section className="space-y-2 rounded-lg border p-3">
        <Button
          size="sm"
          className="w-full"
          disabled={coach.isPending}
          onClick={() => {
            setCoachFor(coachKey);
            coach.mutate();
          }}
        >
          {coach.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {coach.isPending ? "Lendo a conversa..." : "Em que etapa estou? O que mando?"}
        </Button>
        {coachResult && (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Etapa:</span> <strong>{coachResult.stageName ?? "não identificada"}</strong>
            </p>
            {coachResult.reason && <p className="text-muted-foreground text-xs">{coachResult.reason}</p>}
            {coachResult.nextStep && (
              <p>
                <span className="text-muted-foreground">Próximo passo:</span> {coachResult.nextStep}
              </p>
            )}
            {coachResult.suggestedMessage && (
              <div className="bg-muted/50 space-y-2 rounded-md p-2">
                <p className="whitespace-pre-line">{coachResult.suggestedMessage}</p>
                <Button size="sm" variant="outline" onClick={() => insertIntoDraft(contact.id, coachResult.suggestedMessage)}>
                  <CornerDownLeft className="h-4 w-4" />
                  Usar na mensagem
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <ol className="space-y-2">
        {script.stages.map((stage, index) => {
          const isOpen = openStage === stage.key;
          return (
            <li key={stage.key} className={cn("rounded-lg border", currentKey === stage.key && "border-green-500")}>
              <button
                type="button"
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                onClick={() => setOpenStage(isOpen ? null : stage.key)}
              >
                <span className="text-muted-foreground text-xs tabular-nums">{index + 1}</span>
                <span className="font-medium">{stage.name}</span>
                {currentKey === stage.key && <span className="ml-auto text-xs text-green-700 dark:text-green-400">agora</span>}
              </button>
              {isOpen && (
                <div className="space-y-3 border-t px-3 py-2 text-sm">
                  {stage.goal && <p className="text-muted-foreground">{stage.goal}</p>}
                  {stage.questions.length + stage.lines.length > 0 && (
                    <ul className="space-y-1">
                      {[...stage.questions, ...stage.lines].map((text) => (
                        <li key={text}>
                          <button
                            type="button"
                            title="Inserir na mensagem"
                            className="hover:bg-muted/60 flex w-full items-start gap-2 rounded px-1.5 py-1 text-left"
                            onClick={() => insert(text)}
                          >
                            <CornerDownLeft className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{fill(text)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {stage.advanceSignals.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase">Avance quando</p>
                      <ul className="list-disc pl-5">
                        {stage.advanceSignals.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {stage.avoid.length > 0 && (
                    <div>
                      <p className="text-muted-foreground text-xs font-medium uppercase">Evite</p>
                      <ul className="list-disc pl-5">
                        {stage.avoid.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-muted-foreground text-xs">Clique numa fala para colocá-la na caixa de mensagem. Nada é enviado sozinho.</p>
    </div>
  );
};
