import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { proposalService } from "@/services/api/proposalService";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CheckCircle2, Download, FileX } from "lucide-react";
import { type FC, type FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { ProposalDocument } from "./proposalDocument";
import { formatProposalDate } from "./proposalFormat";

const acceptMessages: Record<Exclude<PublicProposalAcceptResult, "OK">, string> = {
  INVALID: "Informe seu nome completo e tente de novo.",
  CLOSED: "Esta proposta já foi respondida.",
  EXPIRED: "Esta proposta venceu. Fale com a gente para receber uma atualizada.",
};

/**
 * Página pública da proposta (link enviado ao cliente): sem login, pelo token. Mostra a proposta com a marca, entrega o
 * PDF e recebe o aceite ou a recusa.
 */
export const PublicProposal: FC = () => {
  const { token = "" } = useParams();
  const queryClient = useQueryClient();
  const queryKey = ["publicProposal", token];
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey,
    queryFn: () => proposalService.findPublic(token),
    retry: (count, error) => !(isAxiosError(error) && error.response?.status === 404) && count < 2,
    // Cada leitura conta como abertura da proposta: não reler ao voltar para a aba
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });
  const proposal = query.data;

  useEffect(() => {
    document.title = proposal ? `Proposta nº ${proposal.number} · ${proposal.brand.name}` : "Proposta";
  }, [proposal]);

  const refresh = () => queryClient.invalidateQueries({ queryKey });
  const notFound = isAxiosError(query.error) && query.error.response?.status === 404;

  return (
    <div className="bg-muted/40 min-h-dvh">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        {query.isLoading && <LoadingState label="Carregando proposta..." />}
        {query.isError &&
          (notFound ? (
            <div className="bg-background mx-auto max-w-md rounded-xl border p-8 text-center">
              <FileX className="text-muted-foreground mx-auto mb-3 h-8 w-8" />
              <h1 className="mb-2 text-lg font-semibold">Proposta não encontrada</h1>
              <p className="text-muted-foreground text-sm">O link não é válido ou a proposta ainda não foi enviada.</p>
            </div>
          ) : (
            <ErrorState message="Não foi possível abrir a proposta." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
          ))}
        {proposal && (
          <ProposalDocument proposal={proposal}>
            <Answer token={token} proposal={proposal} onAnswered={refresh} />
          </ProposalDocument>
        )}
      </main>
    </div>
  );
};

/** Bloco final: aceite e recusa enquanto está enviada; depois, a situação. O PDF fica disponível em todos os casos. */
const Answer: FC<{ token: string; proposal: ProposalView; onAnswered: () => void }> = ({ token, proposal, onAnswered }) => {
  const [name, setName] = useState("");
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");

  const pdf = useMutation({
    mutationFn: () => proposalService.publicPdfUrl(token),
    onSuccess: ({ url }) => {
      // Depois da espera, o navegador pode bloquear a nova aba (comum no celular): abre na mesma
      const opened = window.open(url, "_blank");
      if (opened) opened.opener = null;
      else window.location.assign(url);
    },
    onError: () => toast.error("O PDF não está disponível agora. Tente de novo em instantes."),
  });

  const accept = useMutation({
    mutationFn: () => proposalService.acceptPublic(token, name),
    onSuccess: ({ result }) => {
      if (result === "OK") {
        toast.success("Proposta aceita! A equipe já foi avisada.");
        onAnswered();
        return;
      }
      toast.error(acceptMessages[result]);
      if (result !== "INVALID") onAnswered();
    },
    onError: () => toast.error("Não foi possível registrar o aceite. Verifique sua conexão e tente de novo."),
  });

  const decline = useMutation({
    mutationFn: () => proposalService.declinePublic(token, reason.trim() || undefined),
    onSuccess: ({ declined }) => {
      toast[declined ? "success" : "error"](declined ? "Obrigado pelo retorno." : "Esta proposta já foi respondida.");
      onAnswered();
    },
    onError: () => toast.error("Não foi possível registrar a recusa. Verifique sua conexão e tente de novo."),
  });

  const pdfButton = proposal.hasPdf && (
    <Button
      type="button"
      variant="outline"
      onClick={() => pdf.mutate()}
      disabled={pdf.isPending}
      style={{ borderColor: proposal.brand.accentColor, color: proposal.brand.accentColor }}
    >
      <Download className="h-4 w-4" />
      Baixar PDF
    </Button>
  );

  if (proposal.status !== "SENT") {
    const messages: Partial<Record<ProposalStatus, string>> = {
      ACCEPTED: proposal.acceptedAt
        ? `Proposta aceita por ${proposal.acceptedName ?? ""} em ${formatProposalDate(proposal.acceptedAt)}. Obrigado!`
        : "Proposta aceita. Obrigado!",
      DECLINED: "Proposta recusada. Obrigado pelo retorno.",
      EXPIRED: "Esta proposta venceu. Fale com a gente para receber uma atualizada.",
    };
    const message = messages[proposal.status] ?? "Esta proposta não está aberta para resposta.";
    return (
      <div
        className={`mt-7 flex flex-col gap-3 rounded-lg border p-5 ${proposal.status === "ACCEPTED" ? "border-green-600/30 bg-green-600/10" : ""}`}
      >
        <p className="flex items-center gap-2 font-semibold">
          {proposal.status === "ACCEPTED" && <CheckCircle2 className="h-5 w-5 text-green-600" />}
          {message}
        </p>
        {pdfButton && <div>{pdfButton}</div>}
      </div>
    );
  }

  const submitAccept = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 3) {
      toast.error(acceptMessages.INVALID);
      return;
    }
    accept.mutate();
  };

  return (
    <div className="mt-7 space-y-4">
      <form onSubmit={submitAccept} className="grid gap-3 rounded-lg border p-5">
        <strong>Aceitar a proposta</strong>
        <div className="grid gap-1.5">
          <Label htmlFor="accept-name">Seu nome completo</Label>
          <Input
            id="accept-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            minLength={3}
            maxLength={200}
            autoComplete="name"
            required
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="submit"
            disabled={accept.isPending}
            className="text-white hover:opacity-90"
            style={{ backgroundColor: proposal.brand.accentColor }}
          >
            {accept.isPending ? "Registrando..." : "Aceito a proposta"}
          </Button>
          {pdfButton}
        </div>
        <p className="text-muted-foreground text-xs">Ao aceitar, registramos seu nome, a data e o endereço de acesso como confirmação.</p>
      </form>

      <div className="rounded-lg border p-5">
        {declining ? (
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              decline.mutate();
            }}
          >
            <Label htmlFor="decline-reason">Se puder, conte o motivo</Label>
            <textarea
              id="decline-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={2000}
              className="border-input bg-background focus-visible:ring-ring/50 w-full rounded-md border px-3 py-2 text-sm outline-none focus-visible:ring-[3px]"
            />
            <div className="flex flex-wrap gap-2.5">
              <Button type="submit" variant="outline" disabled={decline.isPending}>
                {decline.isPending ? "Registrando..." : "Recusar"}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDeclining(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            className="text-muted-foreground text-sm underline-offset-4 hover:underline"
            onClick={() => setDeclining(true)}
          >
            Não quero seguir com esta proposta
          </button>
        )}
      </div>
    </div>
  );
};
