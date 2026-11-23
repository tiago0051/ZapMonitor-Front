import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { formatMoney, selectClassName } from "@/pages/dashboard/offers/offerUtils";
import { proposalService } from "@/services/api/proposalService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilePlus2, Loader2 } from "lucide-react";
import { useState, type FC } from "react";
import { ProposalEditorDialog } from "./proposalEditorDialog";
import { proposalStatusInfo, viewSummary } from "./proposalUtils";

/** Propostas do negócio: criar a partir dos itens (a IA redige) e acompanhar envio, aberturas e aceite. */
export const DealProposals: FC<{ deal: Deal }> = ({ deal }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");
  const [withAi, setWithAi] = useState(true);

  const proposalsQuery = useQuery({
    queryKey: ["dealProposals", client.id, deal.id],
    queryFn: () => proposalService.findByDeal(client.id, deal.id),
  });
  const templatesQuery = useQuery({ queryKey: ["proposalTemplates", client.id], queryFn: () => proposalService.findTemplates(client.id) });

  const create = useMutation({
    mutationFn: () => proposalService.create(client.id, deal.id, { templateId: templateId || null, withAi }),
    onError: requestErrorHandling,
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: ["dealProposals", client.id, deal.id] });
      queryClient.invalidateQueries({ queryKey: ["proposals", client.id] });
      setOpenId(proposal.id);
    },
  });

  const proposals = proposalsQuery.data ?? [];
  const templates = templatesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div className="grid gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Nova proposta</p>
        <p className="text-muted-foreground text-xs">
          Usa os itens de "O que está sendo vendido" com o preço do cadastro. A IA lê a conversa e escreve o texto; você revisa antes de
          enviar.
        </p>
        {templates.length > 1 && (
          <select
            id="deal-proposal-template"
            aria-label="Modelo da proposta"
            className={selectClassName}
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            <option value="">Modelo padrão</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={withAi} onCheckedChange={(checked) => setWithAi(checked === true)} />A IA escreve o texto a partir da conversa
        </label>
        <Button size="sm" className="w-fit" disabled={create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
          {create.isPending ? (withAi ? "A IA está escrevendo..." : "Criando...") : "Criar proposta"}
        </Button>
      </div>

      {proposals.length === 0 ? (
        !proposalsQuery.isLoading && <p className="text-muted-foreground text-sm">Nenhuma proposta neste negócio.</p>
      ) : (
        <ul className="space-y-2">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <button
                type="button"
                className="hover:bg-muted/40 focus-visible:ring-ring/50 grid w-full gap-1 rounded-md border p-3 text-left text-sm outline-none focus-visible:ring-[3px]"
                onClick={() => setOpenId(proposal.id)}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">Nº {proposal.number}</span>
                  <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", proposalStatusInfo[proposal.status].className)}>
                    {proposalStatusInfo[proposal.status].label}
                  </span>
                  <span className="ml-auto tabular-nums">{formatMoney(proposal.total)}</span>
                </span>
                <span className="text-muted-foreground truncate">{proposal.title}</span>
                {viewSummary(proposal) && <span className="text-muted-foreground text-xs">{viewSummary(proposal)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId && <ProposalEditorDialog proposalId={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
};
