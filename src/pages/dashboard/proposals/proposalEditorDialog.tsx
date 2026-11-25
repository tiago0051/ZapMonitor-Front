import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { formatMoney, parseDecimal, textareaClassName } from "@/pages/dashboard/offers/offerUtils";
import { proposalService } from "@/services/api/proposalService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Copy, Download, FileText, Loader2, Mail, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { ProposalDocument } from "@/pages/proposal/proposalDocument";
import { isProposalLocked, proposalStatusInfo, viewSummary } from "./proposalUtils";

type ItemRow = Omit<ProposalItem, "quantity" | "unitPrice" | "discountPercent" | "total"> & {
  quantity: string;
  unitPrice: string;
  discountPercent: string;
};

type Draft = {
  title: string;
  customerName: string;
  customerCompany: string;
  customerEmail: string;
  sections: ProposalSection[];
  items: ItemRow[];
  paymentTerms: string;
  terms: string;
  validUntil: string;
};

const decimalText = (value: number) => String(value).replace(".", ",");

const toDraft = (proposal: Proposal): Draft => ({
  title: proposal.title,
  customerName: proposal.customerName ?? "",
  customerCompany: proposal.customerCompany ?? "",
  customerEmail: proposal.customerEmail ?? "",
  sections: proposal.sections,
  items: proposal.items.map((item) => ({
    ...item,
    quantity: decimalText(item.quantity),
    unitPrice: decimalText(item.unitPrice),
    discountPercent: item.discountPercent ? decimalText(item.discountPercent) : "",
  })),
  paymentTerms: proposal.paymentTerms ?? "",
  terms: proposal.terms ?? "",
  // Data local: 23:59 daqui já é o dia seguinte em UTC, e cortar o ISO andaria a validade um dia a cada salvar
  validUntil: proposal.validUntil ? format(new Date(proposal.validUntil), "yyyy-MM-dd") : "",
});

const rowTotal = (row: ItemRow) => {
  const [quantity, price, discount] = [
    parseDecimal(row.quantity) ?? 0,
    parseDecimal(row.unitPrice) ?? 0,
    parseDecimal(row.discountPercent) ?? 0,
  ];
  if ([quantity, price, discount].some(Number.isNaN)) return 0;
  return Math.round(quantity * price * (1 - discount / 100) * 100) / 100;
};

/**
 * Proposta comercial: o texto que a IA redigiu, os itens com preço do negócio e a prévia de como o cliente vê. Daqui saem o
 * PDF e o envio pelo WhatsApp, por e-mail ou pelo link, que conta as aberturas e recebe o aceite.
 */
export const ProposalEditorDialog: FC<{ proposalId: string; onClose: () => void }> = ({ proposalId, onClose }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const proposalQuery = useQuery({
    queryKey: ["proposal", client.id, proposalId],
    queryFn: () => proposalService.find(client.id, proposalId),
    // PDF sendo gerado no worker: confere de novo até ficar pronto
    refetchInterval: (query) => (query.state.data?.pdfStatus === "RENDERING" ? 3000 : false),
  });
  const proposal = proposalQuery.data;
  const previewQuery = useQuery({
    queryKey: ["proposalPreview", client.id, proposalId, proposal?.version],
    queryFn: () => proposalService.preview(client.id, proposalId),
    enabled: !!proposal,
  });

  const current = draft ?? (proposal ? toDraft(proposal) : null);
  const isDirty = !!draft;
  const locked = proposal ? isProposalLocked(proposal) : true;

  const applyResult = (updated: Proposal, message?: string) => {
    queryClient.setQueryData(["proposal", client.id, proposalId], updated);
    queryClient.invalidateQueries({ queryKey: ["proposals", client.id] });
    queryClient.invalidateQueries({ queryKey: ["dealProposals", client.id, updated.dealId] });
    setDraft(null);
    if (message) toast.success(message);
  };

  const save = useMutation({
    mutationFn: () => {
      const value = current!;
      return proposalService.update(client.id, proposalId, {
        title: value.title,
        customerName: value.customerName || null,
        customerCompany: value.customerCompany || null,
        customerEmail: value.customerEmail || null,
        sections: value.sections,
        items: value.items.map((row) => ({
          offerId: row.offerId,
          name: row.name,
          description: row.description,
          billing: row.billing,
          quantity: parseDecimal(row.quantity) ?? 1,
          unitPrice: parseDecimal(row.unitPrice) ?? 0,
          discountPercent: parseDecimal(row.discountPercent) ?? 0,
        })),
        paymentTerms: value.paymentTerms || null,
        terms: value.terms || null,
        validUntil: value.validUntil ? new Date(`${value.validUntil}T23:59:00`).toISOString() : null,
      });
    },
    onError: requestErrorHandling,
    onSuccess: (updated) =>
      applyResult(
        updated,
        updated.status === "PENDING_APPROVAL" ? "Salva. O desconto precisa de aprovação antes do envio." : "Proposta salva",
      ),
  });
  const ai = useMutation({
    mutationFn: () => proposalService.writeWithAi(client.id, proposalId),
    onError: requestErrorHandling,
    onSuccess: (updated) => applyResult(updated, "A IA reescreveu o texto. Revise antes de enviar."),
  });
  const decide = useMutation({
    mutationFn: (approve: boolean) => proposalService.decideDiscount(client.id, proposalId, approve),
    onError: requestErrorHandling,
    onSuccess: (updated) => applyResult(updated, updated.discountApproval === "APPROVED" ? "Desconto aprovado" : "Desconto recusado"),
  });
  const pdf = useMutation({
    mutationFn: () => proposalService.requestPdf(client.id, proposalId),
    onError: requestErrorHandling,
    onSuccess: (updated) => applyResult(updated),
  });
  const download = useMutation({
    mutationFn: () => proposalService.pdfUrl(client.id, proposalId),
    onError: requestErrorHandling,
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener"),
  });
  const whatsapp = useMutation({
    mutationFn: () => proposalService.sendWhatsapp(client.id, proposalId),
    onError: requestErrorHandling,
    onSuccess: (updated) => applyResult(updated, "PDF enviado na conversa, com o link para aceitar"),
  });
  const email = useMutation({
    mutationFn: () => proposalService.sendEmail(client.id, proposalId, current?.customerEmail || undefined),
    onError: requestErrorHandling,
    onSuccess: (updated) => applyResult(updated, "E-mail na fila de envio"),
  });
  const link = useMutation({
    mutationFn: () => proposalService.shareLink(client.id, proposalId),
    onError: requestErrorHandling,
    onSuccess: async ({ url, proposal: updated }) => {
      applyResult(updated);
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado. As aberturas passam a ser contadas.");
      } catch {
        toast.message(url);
      }
    },
  });

  const edit = (changes: Partial<Draft>) => current && setDraft({ ...current, ...changes });
  const editSection = (index: number, body: string) =>
    current && edit({ sections: current.sections.map((section, i) => (i === index ? { ...section, body } : section)) });
  const editItem = (index: number, changes: Partial<ItemRow>) =>
    current && edit({ items: current.items.map((row, i) => (i === index ? { ...row, ...changes } : row)) });

  const busy = save.isPending || ai.isPending || pdf.isPending || whatsapp.isPending || email.isPending || link.isPending;
  const canShare = !!proposal && !isDirty && proposal.status !== "PENDING_APPROVAL" && proposal.items.length > 0 && !locked;
  const total = current?.items.reduce((sum, row) => sum + rowTotal(row), 0) ?? 0;

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="max-h-[94dvh] overflow-y-auto sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{proposal ? `Proposta nº ${proposal.number}` : "Proposta"}</DialogTitle>
          <DialogDescription>
            Os preços vêm dos itens do negócio. A IA escreve o texto; você revisa, gera o PDF e envia. O link mostra quando o cliente abriu
            e recebe o aceite.
          </DialogDescription>
        </DialogHeader>

        {proposalQuery.isLoading || !current ? (
          proposalQuery.isError ? (
            <ErrorState message="Não foi possível abrir a proposta" onRetry={() => proposalQuery.refetch()} />
          ) : (
            <LoadingState />
          )
        ) : (
          proposal && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="grid content-start gap-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn("rounded px-1.5 py-0.5 font-medium", proposalStatusInfo[proposal.status].className)}>
                    {proposalStatusInfo[proposal.status].label}
                  </span>
                  <span className="text-muted-foreground tabular-nums">versão {proposal.version}</span>
                  {viewSummary(proposal) && <span className="text-muted-foreground">· {viewSummary(proposal)}</span>}
                  {proposal.acceptedAt && (
                    <span className="text-green-700 dark:text-green-400">
                      · Aceita por {proposal.acceptedName} em{" "}
                      {new Date(proposal.acceptedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  )}
                  {proposal.declinedAt && (
                    <span className="text-red-700 dark:text-red-400">
                      · Recusada{proposal.declineReason ? `: ${proposal.declineReason}` : ""}
                    </span>
                  )}
                </div>

                {proposal.status === "PENDING_APPROVAL" && (
                  <div className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-sm dark:border-amber-700/60 dark:bg-amber-950/30">
                    <p>O desconto passa do máximo da oferta. Quem gerencia as ofertas precisa aprovar antes do envio.</p>
                    {can("offers.manage") && (
                      <div className="flex gap-2">
                        <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate(true)}>
                          Aprovar desconto
                        </Button>
                        <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate(false)}>
                          Recusar
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {proposal.discountApproval === "REJECTED" && (
                  <p className="text-destructive text-sm">O desconto foi recusado. Ajuste os itens para enviar.</p>
                )}
                {proposal.warnings.length > 0 && (
                  <p className="flex gap-2 rounded-lg border border-amber-300 p-3 text-sm dark:border-amber-700/60">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      O texto cita {proposal.warnings.join(", ")}, que não bate com os itens nem com o preço das ofertas. Confira antes de
                      enviar.
                    </span>
                  </p>
                )}

                <fieldset disabled={locked || busy} className="grid gap-4">
                  <div className="grid gap-1">
                    <Label htmlFor="proposal-title">Título</Label>
                    <Input
                      id="proposal-title"
                      maxLength={200}
                      value={current.title}
                      onChange={(event) => edit({ title: event.target.value })}
                    />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input
                      id="proposal-customer"
                      aria-label="Nome do cliente"
                      placeholder="Cliente"
                      maxLength={200}
                      value={current.customerName}
                      onChange={(event) => edit({ customerName: event.target.value })}
                    />
                    <Input
                      id="proposal-company"
                      aria-label="Empresa do cliente"
                      placeholder="Empresa"
                      maxLength={200}
                      value={current.customerCompany}
                      onChange={(event) => edit({ customerCompany: event.target.value })}
                    />
                    <Input
                      id="proposal-email"
                      aria-label="E-mail do cliente"
                      type="email"
                      placeholder="E-mail"
                      maxLength={320}
                      value={current.customerEmail}
                      onChange={(event) => edit({ customerEmail: event.target.value })}
                    />
                  </div>

                  {current.sections.map((section, index) =>
                    section.kind === "ITEMS" ? (
                      <section key={index} className="grid gap-2">
                        <h3 className="text-sm font-medium">{section.title}</h3>
                        {current.items.length === 0 && (
                          <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                            Sem itens. Adicione as ofertas em "O que está sendo vendido" no negócio e crie a proposta de novo.
                          </p>
                        )}
                        <ul className="grid gap-2">
                          {current.items.map((row, itemIndex) => (
                            <li key={itemIndex} className="grid gap-2 rounded-md border p-2">
                              <div className="flex items-center gap-2">
                                <span className="flex-1 text-sm font-medium">{row.name}</span>
                                <span className="text-sm tabular-nums">{formatMoney(rowTotal(row))}</span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Remover ${row.name}`}
                                  onClick={() => edit({ items: current.items.filter((_, i) => i !== itemIndex) })}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <Input
                                  id={`proposal-qty-${itemIndex}`}
                                  aria-label={`Quantidade de ${row.name}`}
                                  inputMode="decimal"
                                  value={row.quantity}
                                  onChange={(event) => editItem(itemIndex, { quantity: event.target.value })}
                                />
                                <Input
                                  id={`proposal-price-${itemIndex}`}
                                  aria-label={`Preço de ${row.name}`}
                                  inputMode="decimal"
                                  value={row.unitPrice}
                                  onChange={(event) => editItem(itemIndex, { unitPrice: event.target.value })}
                                />
                                <Input
                                  id={`proposal-discount-${itemIndex}`}
                                  aria-label={`Desconto em % de ${row.name}`}
                                  inputMode="decimal"
                                  placeholder="Desc. %"
                                  value={row.discountPercent}
                                  onChange={(event) => editItem(itemIndex, { discountPercent: event.target.value })}
                                />
                              </div>
                            </li>
                          ))}
                        </ul>
                        <p className="text-sm font-medium tabular-nums">Total: {formatMoney(total)}</p>
                        <Input
                          id="proposal-payment"
                          aria-label="Condições de pagamento"
                          placeholder="Condições de pagamento"
                          maxLength={2000}
                          value={current.paymentTerms}
                          onChange={(event) => edit({ paymentTerms: event.target.value })}
                        />
                      </section>
                    ) : (
                      <div key={index} className="grid gap-1">
                        <Label htmlFor={`proposal-section-${index}`}>{section.title}</Label>
                        <textarea
                          id={`proposal-section-${index}`}
                          rows={4}
                          maxLength={6000}
                          className={textareaClassName}
                          placeholder='Vazio não aparece na proposta. Tópicos começam com "- ".'
                          value={section.body}
                          onChange={(event) => editSection(index, event.target.value)}
                        />
                      </div>
                    ),
                  )}

                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                    <div className="grid gap-1">
                      <Label htmlFor="proposal-terms">Condições gerais (rodapé)</Label>
                      <textarea
                        id="proposal-terms"
                        rows={2}
                        maxLength={5000}
                        className={textareaClassName}
                        value={current.terms}
                        onChange={(event) => edit({ terms: event.target.value })}
                      />
                    </div>
                    <div className="grid content-start gap-1">
                      <Label htmlFor="proposal-valid">Válida até</Label>
                      <Input
                        id="proposal-valid"
                        type="date"
                        value={current.validUntil}
                        onChange={(event) => edit({ validUntil: event.target.value })}
                      />
                    </div>
                  </div>
                </fieldset>

                {!locked && (
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={!isDirty || busy || !current.title.trim()} onClick={() => save.mutate()}>
                      {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      Salvar
                    </Button>
                    {isDirty && (
                      <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
                        Descartar
                      </Button>
                    )}
                    <Button variant="outline" disabled={busy || isDirty} onClick={() => ai.mutate()}>
                      {ai.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {ai.isPending ? "Escrevendo..." : "Reescrever com a IA"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid content-start gap-3">
                <div className="flex flex-wrap gap-2">
                  {proposal.pdfStatus === "READY" ? (
                    <Button size="sm" variant="outline" disabled={download.isPending} onClick={() => download.mutate()}>
                      <Download className="h-4 w-4" />
                      Baixar PDF
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canShare || busy || proposal.pdfStatus === "RENDERING"}
                      onClick={() => pdf.mutate()}
                    >
                      {proposal.pdfStatus === "RENDERING" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                      {proposal.pdfStatus === "RENDERING" ? "Gerando PDF..." : "Gerar PDF"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    disabled={!canShare || busy || proposal.pdfStatus !== "READY" || !can("whatsapp.chat")}
                    title={proposal.pdfStatus !== "READY" ? "Gere o PDF antes" : "Você precisa estar atendendo a conversa"}
                    onClick={() => whatsapp.mutate()}
                  >
                    {whatsapp.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                    Enviar no WhatsApp
                  </Button>
                  <Button size="sm" variant="outline" disabled={!canShare || busy} onClick={() => email.mutate()}>
                    {email.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    Enviar por e-mail
                  </Button>
                  <Button size="sm" variant="outline" disabled={!canShare || busy} onClick={() => link.mutate()}>
                    <Copy className="h-4 w-4" />
                    Copiar link
                  </Button>
                </div>
                {proposal.pdfStatus === "FAILED" && <p className="text-destructive text-xs">O PDF não foi gerado: {proposal.pdfError}</p>}
                {isDirty && <p className="text-muted-foreground text-xs">Salve as alterações para atualizar a prévia e enviar.</p>}
                {previewQuery.data ? (
                  <div className="bg-muted/40 max-h-[70dvh] overflow-y-auto rounded-lg border p-2 sm:p-4">
                    <ProposalDocument proposal={previewQuery.data} />
                  </div>
                ) : (
                  <LoadingState label="Montando a prévia..." />
                )}
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};
