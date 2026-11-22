import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { offerService } from "@/services/api/offerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { OfferQualificationEditor } from "./offerQualificationEditor";
import { emptyOffer, offerBillingLabel, offerKindLabel, parseDecimal, selectClassName, textareaClassName, toOfferData } from "./offerUtils";

type Props = {
  onClose: () => void;
  // Sem oferta, cadastra uma nova
  offer?: Offer;
};

type ListKey = "pains" | "benefits" | "differentiators" | "proofs" | "restrictions";

const LISTS: { key: ListKey; label: string; hint: string; placeholder: string }[] = [
  {
    key: "pains",
    label: "Dores que resolve",
    hint: "Do ponto de vista do cliente",
    placeholder: "Perde pacientes que chamam fora do horário",
  },
  { key: "benefits", label: "Benefícios", hint: "O que o cliente ganha", placeholder: "Responde em segundos, 24 horas por dia" },
  { key: "differentiators", label: "Diferenciais", hint: "Por que comprar de você", placeholder: "Implantação em 1 dia, sem fidelidade" },
  {
    key: "proofs",
    label: "Provas",
    hint: "Números, cases, depoimentos. A IA só cita o que estiver aqui",
    placeholder: "120 clínicas atendidas desde 2021",
  },
  {
    key: "restrictions",
    label: "Não prometer",
    hint: "O que ninguém pode garantir em nome da empresa",
    placeholder: "Aumento de faturamento garantido",
  },
];

const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** Cadastro da oferta: a fonte de preço, condições, provas e objeções que toda IA do sistema usa. */
export const OfferEditorDialog: FC<Props> = ({ onClose, offer }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("offers.manage");
  const [data, setData] = useState<OfferData>(() => (offer ? toOfferData(offer) : emptyOffer()));
  // Listas e números ficam como texto enquanto a pessoa digita
  const [lists, setLists] = useState<Record<ListKey, string>>(() => {
    const source = offer ?? emptyOffer();
    return Object.fromEntries(LISTS.map(({ key }) => [key, toLines(source[key])])) as Record<ListKey, string>;
  });
  const [priceText, setPriceText] = useState(offer?.price != null ? String(offer.price).replace(".", ",") : "");
  const [discountText, setDiscountText] = useState(
    offer?.maxDiscountPercent != null ? String(offer.maxDiscountPercent).replace(".", ",") : "",
  );
  const [draftText, setDraftText] = useState("");
  const [draftUrl, setDraftUrl] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [isDraftOpen, setIsDraftOpen] = useState(!offer);
  const update = (changes: Partial<OfferData>) => setData((current) => ({ ...current, ...changes }));

  const price = parseDecimal(priceText);
  const discount = parseDecimal(discountText);
  const priceInvalid = price !== null && (Number.isNaN(price) || price < 0);
  const discountInvalid = discount !== null && (Number.isNaN(discount) || discount < 0 || discount > 100);

  const draft = useMutation({
    mutationFn: () => offerService.draft(client.id, { text: draftText, url: draftUrl, file: draftFile }),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      setData(result);
      setLists(Object.fromEntries(LISTS.map(({ key }) => [key, toLines(result[key])])) as Record<ListKey, string>);
      setPriceText(result.price != null ? String(result.price).replace(".", ",") : "");
      setDiscountText(result.maxDiscountPercent != null ? String(result.maxDiscountPercent).replace(".", ",") : "");
      setIsDraftOpen(false);
      toast.success("A IA preencheu a oferta. Revise preço, condições e provas antes de salvar.");
    },
  });

  const save = useMutation({
    mutationFn: () => {
      const body: OfferData = {
        ...data,
        name: data.name.trim(),
        price,
        maxDiscountPercent: discount,
        ...(Object.fromEntries(LISTS.map(({ key }) => [key, fromLines(lists[key])])) as Record<ListKey, string[]>),
        objections: data.objections.filter((item) => item.objection.trim() && item.answer.trim()),
        qualificationCriteria: data.qualificationCriteria
          .map((item) => ({ ...item, label: item.label.trim(), question: item.question?.trim() || null }))
          .filter((item) => item.label),
      };
      return offer ? offerService.update(client.id, offer.id, body) : offerService.create(client.id, body);
    },
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", client.id] });
      toast.success(offer ? "Oferta atualizada" : "Oferta cadastrada");
      onClose();
    },
  });

  const canSubmit = canManage && !!data.name.trim() && !priceInvalid && !discountInvalid && !save.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) save.mutate();
  };
  const canDraft = !draft.isPending && (!!draftText.trim() || !!draftUrl.trim() || !!draftFile);

  const setObjection = (index: number, changes: Partial<OfferObjection>) =>
    update({ objections: data.objections.map((item, i) => (i === index ? { ...item, ...changes } : item)) });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{offer ? (canManage ? "Editar oferta" : data.name) : "Nova oferta"}</DialogTitle>
            <DialogDescription>
              Anúncios, postagens, agentes de IA, estratégias e propostas usam este cadastro. A IA nunca cita preço, desconto ou prova que
              não esteja aqui.
            </DialogDescription>
          </DialogHeader>

          {canManage && (
            <section className="bg-muted/40 grid gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">Preencher com a IA</p>
                  <p className="text-muted-foreground text-xs">
                    Descreva, cole a página do produto ou envie um PDF. Você revisa antes de salvar.
                  </p>
                </div>
                {!isDraftOpen && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsDraftOpen(true)}>
                    <Sparkles className="h-4 w-4" />
                    Usar a IA
                  </Button>
                )}
              </div>
              {isDraftOpen && (
                <div className="grid gap-2">
                  <textarea
                    id="offer-draft-text"
                    aria-label="Descrição livre da oferta"
                    rows={3}
                    maxLength={20000}
                    className={textareaClassName}
                    placeholder="Ex.: Plano mensal de R$ 297 para clínicas, com atendimento no WhatsApp por IA, sem fidelidade, implantação em 1 dia..."
                    value={draftText}
                    onChange={(event) => setDraftText(event.target.value)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input
                      id="offer-draft-url"
                      aria-label="Página do produto"
                      type="url"
                      placeholder="https://suaempresa.com.br/produto"
                      value={draftUrl}
                      onChange={(event) => setDraftUrl(event.target.value)}
                    />
                    <Input
                      id="offer-draft-file"
                      aria-label="Arquivo com a oferta (PDF, TXT ou CSV)"
                      type="file"
                      accept=".pdf,.txt,.csv,.md,application/pdf,text/plain,text/csv"
                      onChange={(event) => setDraftFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" size="sm" disabled={!canDraft} onClick={() => draft.mutate()}>
                      {draft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {draft.isPending ? "Lendo o material..." : "Preencher"}
                    </Button>
                  </div>
                </div>
              )}
            </section>
          )}

          <fieldset disabled={!canManage} className="grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor="offer-name">Nome</Label>
                <Input
                  id="offer-name"
                  maxLength={200}
                  placeholder="Ex.: Plano Profissional"
                  value={data.name}
                  onChange={(event) => update({ name: event.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="offer-kind">Tipo</Label>
                <select
                  id="offer-kind"
                  className={selectClassName}
                  value={data.kind}
                  onChange={(event) => update({ kind: event.target.value as OfferKind })}
                >
                  {Object.entries(offerKindLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1 sm:col-span-3">
                <Label htmlFor="offer-summary">O que é, em uma frase</Label>
                <Input
                  id="offer-summary"
                  maxLength={500}
                  placeholder="Ex.: Atendimento no WhatsApp com IA para clínicas pequenas"
                  value={data.summary ?? ""}
                  onChange={(event) => update({ summary: event.target.value || null })}
                />
              </div>
              <div className="grid gap-1 sm:col-span-3">
                <Label htmlFor="offer-description">Descrição</Label>
                <textarea
                  id="offer-description"
                  rows={3}
                  maxLength={5000}
                  className={textareaClassName}
                  placeholder="Como funciona, o que está incluso, como é entregue"
                  value={data.description ?? ""}
                  onChange={(event) => update({ description: event.target.value || null })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1">
                <Label htmlFor="offer-price">Preço (R$)</Label>
                <Input
                  id="offer-price"
                  inputMode="decimal"
                  placeholder="Vazio = sob consulta"
                  value={priceText}
                  aria-invalid={priceInvalid}
                  onChange={(event) => setPriceText(event.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="offer-billing">Cobrança</Label>
                <select
                  id="offer-billing"
                  className={selectClassName}
                  value={data.billing}
                  onChange={(event) => update({ billing: event.target.value as OfferBilling })}
                >
                  {Object.entries(offerBillingLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="offer-discount">Desconto máximo (%)</Label>
                <Input
                  id="offer-discount"
                  inputMode="decimal"
                  placeholder="Ex.: 10"
                  value={discountText}
                  aria-invalid={discountInvalid}
                  onChange={(event) => setDiscountText(event.target.value)}
                />
              </div>
              <p className="text-muted-foreground text-xs sm:col-span-3">
                Desconto acima do máximo só com quem cadastra ofertas. Sem máximo, nem a equipe nem a IA oferecem desconto sozinhas.
              </p>
              <div className="grid gap-1 sm:col-span-3">
                <Label htmlFor="offer-payment">Condições de pagamento</Label>
                <Input
                  id="offer-payment"
                  maxLength={2000}
                  placeholder="Ex.: até 12x no cartão ou 5% à vista no Pix"
                  value={data.paymentTerms ?? ""}
                  onChange={(event) => update({ paymentTerms: event.target.value || null })}
                />
              </div>
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor="offer-audience">Para quem é</Label>
                <Input
                  id="offer-audience"
                  maxLength={2000}
                  placeholder="Ex.: clínicas com 1 a 5 profissionais"
                  value={data.audience ?? ""}
                  onChange={(event) => update({ audience: event.target.value || null })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="offer-guarantee">Garantia</Label>
                <Input
                  id="offer-guarantee"
                  maxLength={2000}
                  placeholder="Ex.: 7 dias"
                  value={data.guarantee ?? ""}
                  onChange={(event) => update({ guarantee: event.target.value || null })}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {LISTS.map((list) => (
                <div key={list.key} className="grid gap-1">
                  <Label htmlFor={`offer-${list.key}`}>{list.label}</Label>
                  <textarea
                    id={`offer-${list.key}`}
                    rows={3}
                    className={textareaClassName}
                    placeholder={list.placeholder}
                    value={lists[list.key]}
                    onChange={(event) => setLists((current) => ({ ...current, [list.key]: event.target.value }))}
                  />
                  <p className="text-muted-foreground text-xs">{list.hint}. Um por linha.</p>
                </div>
              ))}
            </div>

            <section className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-medium">Objeções e respostas</h3>
                  <p className="text-muted-foreground text-xs">O que o cliente costuma dizer antes de comprar e como a equipe responde.</p>
                </div>
                {canManage && data.objections.length < 15 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => update({ objections: [...data.objections, { objection: "", answer: "" }] })}
                  >
                    <Plus className="h-4 w-4" />
                    Objeção
                  </Button>
                )}
              </div>
              {data.objections.length === 0 && (
                <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
                  Nenhuma ainda. Exemplos: "está caro", "vou pensar", "já uso outro".
                </p>
              )}
              <ol className="grid gap-2">
                {data.objections.map((item, index) => (
                  <li key={index} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_2fr_auto]">
                    <Input
                      id={`offer-objection-${index}`}
                      aria-label={`Objeção ${index + 1}`}
                      maxLength={400}
                      placeholder="Está caro"
                      value={item.objection}
                      onChange={(event) => setObjection(index, { objection: event.target.value })}
                    />
                    <Input
                      id={`offer-answer-${index}`}
                      aria-label={`Resposta à objeção ${index + 1}`}
                      maxLength={1500}
                      placeholder="Com 2 consultas a mais por mês o plano se paga"
                      value={item.answer}
                      onChange={(event) => setObjection(index, { answer: event.target.value })}
                    />
                    {canManage && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Remover objeção ${index + 1}`}
                        onClick={() => update({ objections: data.objections.filter((_, i) => i !== index) })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </section>

            <OfferQualificationEditor
              criteria={data.qualificationCriteria}
              minScore={data.qualificationMinScore}
              canManage={canManage}
              onChange={update}
            />

            <div className="grid gap-1">
              <Label htmlFor="offer-url">Página do produto</Label>
              <Input
                id="offer-url"
                type="url"
                maxLength={2000}
                placeholder="https://"
                value={data.url ?? ""}
                onChange={(event) => update({ url: event.target.value || null })}
              />
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {canManage ? "Cancelar" : "Fechar"}
            </Button>
            {canManage && (
              <Button type="submit" disabled={!canSubmit}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {offer ? "Salvar" : "Cadastrar"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
