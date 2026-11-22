import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { offerService } from "@/services/api/offerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, CheckCircle2, Loader2, Package, Plus, ScanSearch } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { OfferEditorDialog } from "./offerEditorDialog";
import { coherencePlaceLabel, formatOfferPrice, offerKindLabel, severityInfo } from "./offerUtils";

/** Catálogo de ofertas: a fonte única de preço, provas e objeções que anúncios, postagens, agentes e estratégias usam. */
export const OffersPage = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("offers.manage");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Offer | "new" | null>(null);
  const [checking, setChecking] = useState<Offer | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  const offersQuery = useQuery({
    queryKey: ["offers", client.id, showArchived],
    queryFn: () => offerService.findAll(client.id, showArchived),
  });
  const offers = offersQuery.data ?? [];

  const archive = useMutation({
    mutationFn: ({ offer, archived }: { offer: Offer; archived: boolean }) => offerService.setArchived(client.id, offer.id, archived),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["offers", client.id] });
      toast.success(saved.status === "ARCHIVED" ? "Oferta arquivada" : "Oferta reativada");
    },
  });

  const askArchive = async (offer: Offer) => {
    const detail = await offerService.find(client.id, offer.id).catch(() => null);
    const usage = detail?.usage;
    const parts = [
      usage?.aiAgents ? `${usage.aiAgents} agente(s) de IA deixam de vendê-la` : null,
      usage?.openDeals ? `${usage.openDeals} negócio(s) aberto(s) mantêm o item como está` : null,
      usage?.strategies ? `${usage.strategies} estratégia(s) ficam sem a oferta na próxima montagem` : null,
    ].filter(Boolean);
    const ok = await confirm({
      title: `Arquivar "${offer.name}"?`,
      description: parts.length
        ? `${parts.join("; ")}. Dá para reativar depois.`
        : "Ela sai do contexto das IAs e da lista de itens dos negócios. Dá para reativar depois.",
      confirmLabel: "Arquivar",
    });
    if (ok) archive.mutate({ offer, archived: true });
  };

  const newButton = canManage && (
    <Button onClick={() => setEditing("new")}>
      <Plus className="h-4 w-4" />
      Nova oferta
    </Button>
  );

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl space-y-1">
            <h1 className="text-2xl font-semibold">Ofertas</h1>
            <p className="text-muted-foreground text-sm">
              Produtos, serviços e planos com preço, condições, provas e respostas às objeções. Anúncios, postagens, agentes de IA,
              estratégias e os itens dos negócios usam este cadastro, então todo canal fala a mesma coisa.
            </p>
          </div>
          {newButton}
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
          <Switch id="offers-archived" checked={showArchived} onCheckedChange={setShowArchived} />
          Mostrar arquivadas
        </label>

        {offersQuery.isLoading ? (
          <LoadingState />
        ) : offersQuery.isError ? (
          <ErrorState message="Não foi possível carregar as ofertas" onRetry={() => offersQuery.refetch()} />
        ) : offers.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhuma oferta cadastrada"
            description="Cadastre o que você vende. A IA pode preencher a partir de um texto, da página do produto ou de um PDF."
            action={newButton}
          />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <li key={offer.id} className={cn("grid gap-2 rounded-lg border p-4", offer.status === "ARCHIVED" && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="bg-muted rounded px-1.5 py-0.5 font-medium">{offerKindLabel[offer.kind]}</span>
                  {offer.status === "ARCHIVED" && <span className="bg-muted rounded px-1.5 py-0.5 font-medium">Arquivada</span>}
                  <span className="text-muted-foreground ml-auto tabular-nums">versão {offer.version}</span>
                </div>
                <button
                  type="button"
                  className="focus-visible:ring-ring/50 grid gap-1 rounded text-left outline-none focus-visible:ring-[3px]"
                  onClick={() => setEditing(offer)}
                >
                  <span className="font-medium">{offer.name}</span>
                  <span className="text-sm tabular-nums">{formatOfferPrice(offer)}</span>
                  {offer.summary && <span className="text-muted-foreground text-sm">{offer.summary}</span>}
                </button>
                <p className="text-muted-foreground text-xs">
                  {[
                    offer.objections.length && `${offer.objections.length} objeção(ões)`,
                    offer.proofs.length && `${offer.proofs.length} prova(s)`,
                    offer.maxDiscountPercent !== null && `desconto até ${offer.maxDiscountPercent}%`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Sem objeções e provas ainda"}
                </p>
                {canManage && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {offer.status === "ACTIVE" && (
                      <Button size="sm" variant="outline" onClick={() => setChecking(offer)}>
                        <ScanSearch className="h-4 w-4" />
                        Checar coerência
                      </Button>
                    )}
                    {offer.status === "ACTIVE" ? (
                      <Button size="sm" variant="ghost" disabled={archive.isPending} onClick={() => askArchive(offer)}>
                        <Archive className="h-4 w-4" />
                        Arquivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={archive.isPending}
                        onClick={() => archive.mutate({ offer, archived: false })}
                      >
                        <ArchiveRestore className="h-4 w-4" />
                        Reativar
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {editing && <OfferEditorDialog offer={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
        {checking && <OfferCoherenceDialog offer={checking} onClose={() => setChecking(null)} />}
        {confirmDialog}
      </div>
    </div>
  );
};

/** A IA compara a oferta com agentes, postagens, modelos e estratégias e aponta o que a contradiz. */
const OfferCoherenceDialog: FC<{ offer: Offer; onClose: () => void }> = ({ offer, onClose }) => {
  const { client } = useClientContext();
  const check = useMutation({
    mutationFn: () => offerService.checkCoherence(client.id, offer.id),
    onError: requestErrorHandling,
  });
  const { mutate } = check;
  // Uma checagem por abertura: a IA custa cota (o modo estrito do React monta duas vezes em desenvolvimento)
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mutate();
  }, [mutate]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Coerência de "{offer.name}"</DialogTitle>
          <DialogDescription>
            A IA lê os agentes de IA, as últimas postagens, os modelos aprovados do WhatsApp e as estratégias e aponta onde eles contradizem
            preço, condições ou promessas desta oferta. Nada é alterado.
          </DialogDescription>
        </DialogHeader>
        {check.isPending && (
          <p role="status" className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Comparando as peças com a oferta...
          </p>
        )}
        {check.isError && <ErrorState message="Não foi possível checar agora" onRetry={() => check.mutate()} />}
        {check.data && (
          <div className="grid gap-3">
            <p className="text-sm">
              {check.data.summary} <span className="text-muted-foreground">({check.data.checked} peça(s) comparadas)</span>
            </p>
            {check.data.issues.length === 0 ? (
              <p className="flex items-center gap-2 rounded-md border p-3 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4" />
                Nenhuma contradição encontrada.
              </p>
            ) : (
              <ul className="grid gap-2">
                {check.data.issues.map((issue) => (
                  <li key={`${issue.place}-${issue.objectId}-${issue.problem}`} className="grid gap-1 rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={cn("rounded px-1.5 py-0.5 font-medium", severityInfo[issue.severity].className)}>
                        {severityInfo[issue.severity].label}
                      </span>
                      <span className="text-muted-foreground">
                        {coherencePlaceLabel[issue.place]} · {issue.name}
                      </span>
                    </div>
                    <p>{issue.problem}</p>
                    {issue.suggestion && <p className="text-muted-foreground">Sugestão: {issue.suggestion}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
