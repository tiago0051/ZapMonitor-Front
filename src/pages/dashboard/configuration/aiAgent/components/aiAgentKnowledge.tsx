import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { aiAgentService } from "@/services/api/aiAgentService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Globe, Loader2, MessageCircleQuestion, Pencil, Trash2, Upload } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { textareaClassName } from "../aiAgentConstants";

type Props = { clientId: string; aiAgent: AiAgent };
type AddMode = "qa" | "file" | "url";

// Mesmo limite do back; o arquivo maior nem sobe
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FILES = ".pdf,.txt,.md,.csv,application/pdf,text/plain,text/csv";

const KIND_ICONS = { QA: MessageCircleQuestion, FILE: FileText, URL: Globe };
const KIND_LABELS = { QA: "Pergunta e resposta", FILE: "Arquivo", URL: "Página do site" };

const formatChars = (chars: number) =>
  chars >= 1000 ? `${(chars / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil caracteres` : `${chars} caracteres`;

/**
 * Aba "O que o agente sabe": perguntas e respostas, arquivos (PDF, TXT, CSV de preços) e páginas do site. Em cada
 * resposta, o agente recebe só os trechos mais ligados ao que o contato perguntou.
 */
export const AiAgentKnowledge: FC<Props> = ({ clientId, aiAgent }) => {
  const queryKey = ["aiAgentKnowledge", clientId, aiAgent.id];
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();

  const [mode, setMode] = useState<AddMode>("qa");
  const [editing, setEditing] = useState<AiAgentKnowledgeSource | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [url, setUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const knowledgeQuery = useQuery({ queryKey, queryFn: () => aiAgentService.findKnowledge(clientId, aiAgent.id) });
  const knowledge = knowledgeQuery.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const resetQa = () => {
    setEditing(null);
    setQuestion("");
    setAnswer("");
  };

  const saveQa = useMutation({
    mutationFn: () => aiAgentService.saveKnowledgeQa(clientId, aiAgent.id, { question, answer }, editing?.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success(editing ? "Resposta atualizada" : "O agente aprendeu essa resposta");
      resetQa();
      void refresh();
    },
  });

  const addFile = useMutation({
    mutationFn: (file: File) => aiAgentService.addKnowledgeFile(clientId, aiAgent.id, file),
    onError: requestErrorHandling,
    onSuccess: (source) => {
      toast.success(`Arquivo "${source.title}" adicionado`);
      void refresh();
    },
    onSettled: () => {
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
  });

  const addUrl = useMutation({
    mutationFn: () => aiAgentService.addKnowledgeUrl(clientId, aiAgent.id, url.trim()),
    onError: requestErrorHandling,
    onSuccess: (source) => {
      toast.success(`Página "${source.title}" importada`);
      setUrl("");
      void refresh();
    },
  });

  const remove = useMutation({
    mutationFn: (source: AiAgentKnowledgeSource) => aiAgentService.deleteKnowledge(clientId, aiAgent.id, source.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("Item apagado");
      void refresh();
    },
  });

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Arquivo grande demais: o limite é 5 MB");
      return;
    }
    addFile.mutate(file);
  };

  const handleDelete = async (source: AiAgentKnowledgeSource) => {
    const ok = await confirm({
      title: "Apagar este item?",
      description: `O agente deixa de saber o que está em "${source.title}".`,
      confirmLabel: "Apagar",
      destructive: true,
    });
    if (ok) remove.mutate(source);
  };

  const startEdit = (source: AiAgentKnowledgeSource) => {
    setMode("qa");
    setEditing(source);
    setQuestion(source.question ?? "");
    setAnswer(source.answer ?? "");
  };

  if (knowledgeQuery.isLoading) return <LoadingState />;
  if (knowledgeQuery.isError || !knowledge)
    return <ErrorState message="Não foi possível carregar o que o agente sabe" onRetry={() => knowledgeQuery.refetch()} />;

  const { usage } = knowledge;
  const usedPercent = Math.min(100, Math.round((usage.chars / usage.maxChars) * 100));
  const isFull = usage.sources >= usage.maxSources;

  return (
    <div className="space-y-5">
      {confirmDialog}

      <p className="text-muted-foreground text-sm">
        Ensine o agente sobre a sua empresa: preços, horários, regras e dúvidas comuns. A cada mensagem, ele lê só os trechos mais ligados
        ao que o contato perguntou. O que não estiver aqui nem nas instruções, ele não deve inventar.
      </p>

      <div className="space-y-3 rounded-lg border p-4">
        <div role="tablist" aria-label="Como ensinar" className="flex flex-wrap gap-2">
          {(
            [
              { value: "qa", label: "Pergunta e resposta", icon: MessageCircleQuestion },
              { value: "file", label: "Arquivo", icon: Upload },
              { value: "url", label: "Página do site", icon: Globe },
            ] as const
          ).map((option) => (
            <Button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={mode === option.value}
              size="sm"
              variant={mode === option.value ? "default" : "outline"}
              onClick={() => setMode(option.value)}
            >
              <option.icon className="h-4 w-4" />
              {option.label}
            </Button>
          ))}
        </div>

        {mode === "qa" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-question">Pergunta do cliente</Label>
              <Input
                id="knowledge-question"
                value={question}
                maxLength={1000}
                placeholder="Ex.: Vocês atendem aos sábados?"
                onChange={(event) => setQuestion(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="knowledge-answer">Resposta</Label>
              <textarea
                id="knowledge-answer"
                value={answer}
                maxLength={5000}
                placeholder="Ex.: Sim, das 8h às 12h. Aos domingos estamos fechados."
                className={`${textareaClassName} min-h-24`}
                onChange={(event) => setAnswer(event.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!question.trim() || !answer.trim() || saveQa.isPending || (!editing && isFull)}
                onClick={() => saveQa.mutate()}
              >
                {saveQa.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Salvar resposta" : "Adicionar"}
              </Button>
              {editing && (
                <Button type="button" variant="ghost" onClick={resetQa}>
                  Cancelar edição
                </Button>
              )}
            </div>
          </div>
        )}

        {mode === "file" && (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">
              PDF com texto, TXT ou planilha de preços em CSV (no Excel: Salvar como → CSV). Até 5 MB. Arquivos do Word: salve como PDF
              antes.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILES}
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
            <Button type="button" variant="outline" disabled={addFile.isPending || isFull} onClick={() => fileInputRef.current?.click()}>
              {addFile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {addFile.isPending ? "Lendo o arquivo…" : "Escolher arquivo"}
            </Button>
          </div>
        )}

        {mode === "url" && (
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (url.trim()) addUrl.mutate();
            }}
          >
            <Label htmlFor="knowledge-url">Endereço da página</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="knowledge-url"
                type="url"
                value={url}
                maxLength={2000}
                placeholder="https://www.suaempresa.com.br/precos"
                onChange={(event) => setUrl(event.target.value)}
              />
              <Button type="submit" disabled={!url.trim() || addUrl.isPending || isFull} className="shrink-0">
                {addUrl.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Importar página
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Copiamos o texto da página como está agora. Se ela mudar, apague e importe de novo. Páginas que pedem login não funcionam.
            </p>
          </form>
        )}

        {isFull && (
          <p className="text-destructive text-sm">O agente chegou a {usage.maxSources} itens. Apague algum para adicionar outro.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="text-muted-foreground flex flex-wrap justify-between gap-2 text-xs">
          <span>
            {usage.sources} de {usage.maxSources} itens
          </span>
          <span>
            {formatChars(usage.chars)} de {formatChars(usage.maxChars)}
          </span>
        </div>
        <Progress value={usedPercent} aria-label="Espaço usado" />
      </div>

      {knowledge.sources.length === 0 ? (
        <EmptyState title="O agente ainda não sabe nada sobre a empresa" description="Comece pelas perguntas que os clientes mais fazem." />
      ) : (
        <ul className="divide-y rounded-lg border">
          {knowledge.sources.map((source) => {
            const Icon = KIND_ICONS[source.kind];
            return (
              <li key={source.id} className={cn("flex items-start gap-3 p-3", editing?.id === source.id && "bg-muted/50")}>
                <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{source.title}</p>
                  {source.kind === "QA" ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{source.answer}</p>
                  ) : (
                    <p className="text-muted-foreground truncate text-xs">
                      {KIND_LABELS[source.kind]} · {formatChars(source.charCount)}
                      {source.sourceUrl && ` · ${source.sourceUrl}`}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0">
                  {source.kind === "QA" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Editar "${source.title}"`}
                      onClick={() => startEdit(source)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive h-8 w-8"
                    aria-label={`Apagar "${source.title}"`}
                    disabled={remove.isPending}
                    onClick={() => void handleDelete(source)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
