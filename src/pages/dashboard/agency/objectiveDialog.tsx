import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { agencyService } from "@/services/api/agencyService";
import { offerService } from "@/services/api/offerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { selectClassName, textareaClassName } from "../strategies/strategyUtils";
import { defaultMetric, frontInfo, frontOrder, metricLabel, objectiveKindHint, objectiveKindLabel } from "./agencyUtils";

type Props = {
  onClose: () => void;
  // Sem objetivo, cria um novo
  objective?: BusinessObjective;
  // Frentes que o plano permite
  fronts: AgencyFront[];
  // Já existe um principal ativo: o novo nasce como secundário
  hasActivePrimary: boolean;
};

const kinds: ObjectiveKind[] = ["SELL_OFFER", "BRAND", "REACTIVATE_BASE", "LAUNCH"];
const metrics: ObjectiveMetric[] = ["SALES", "REVENUE", "NEW_CONTACTS", "CONVERSATIONS", "REACH", "ENGAGEMENT"];

const toNumber = (value: string) => {
  const parsed = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
};

/** Objetivo da empresa: o que o maestro e as três frentes perseguem, com meta, prazo e frentes envolvidas. */
export const ObjectiveDialog: FC<Props> = ({ onClose, objective, fronts, hasActivePrimary }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ObjectiveKind>(objective?.kind ?? "SELL_OFFER");
  const [priority, setPriority] = useState<ObjectivePriority>(objective?.priority ?? (hasActivePrimary ? "SECONDARY" : "PRIMARY"));
  const [title, setTitle] = useState(objective?.title ?? "");
  const [offerId, setOfferId] = useState(objective?.offerId ?? "");
  const [metric, setMetric] = useState<ObjectiveMetric>(objective?.metric ?? defaultMetric.SELL_OFFER);
  const [target, setTarget] = useState(objective?.target?.toString() ?? "");
  const [startsOn, setStartsOn] = useState(objective?.startsOn ?? "");
  const [deadline, setDeadline] = useState(objective?.deadline ?? "");
  const [monthlyBudget, setMonthlyBudget] = useState(objective?.monthlyBudget?.toString() ?? "");
  const [chosenFronts, setChosenFronts] = useState<AgencyFront[]>(objective?.fronts ?? fronts);
  const [description, setDescription] = useState(objective?.description ?? "");

  const offersQuery = useQuery({
    queryKey: ["offers", client.id, false],
    queryFn: () => offerService.findAll(client.id),
    enabled: can("offers.view"),
  });
  const offers = (offersQuery.data ?? []).filter((offer) => offer.status === "ACTIVE" || offer.id === objective?.offerId);

  const chooseKind = (next: ObjectiveKind) => {
    setKind(next);
    // Ao trocar o tipo, o indicador acompanha a sugestão, a não ser que já tenha sido escolhido em um objetivo salvo
    if (!objective) setMetric(defaultMetric[next]);
  };

  const toggleFront = (front: AgencyFront, checked: boolean) =>
    setChosenFronts((current) => (checked ? [...new Set([...current, front])] : current.filter((item) => item !== front)));

  const save = useMutation({
    mutationFn: () => {
      const body: SaveObjectiveBody = {
        kind,
        priority,
        title: title.trim(),
        description: description.trim() || null,
        offerId: kind === "SELL_OFFER" || offerId ? offerId || null : null,
        metric,
        target: toNumber(target),
        startsOn: startsOn || null,
        deadline: deadline || null,
        monthlyBudget: toNumber(monthlyBudget),
        fronts: chosenFronts,
      };
      return objective ? agencyService.updateObjective(client.id, objective.id, body) : agencyService.createObjective(client.id, body);
    },
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency", client.id] });
      toast.success(objective ? "Objetivo atualizado" : "Objetivo criado");
      onClose();
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const needsOffer = kind === "SELL_OFFER";
  const canSave = title.trim() && chosenFronts.length > 0 && (!needsOffer || offerId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{objective ? "Editar objetivo" : "Novo objetivo da empresa"}</DialogTitle>
          <DialogDescription>
            O maestro e as gestoras de cada frente trabalham para este objetivo. Um principal por vez e até dois secundários.
          </DialogDescription>
        </DialogHeader>

        <form id="objective-form" onSubmit={onSubmit} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">O que a empresa quer agora</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {kinds.map((item) => (
                <label
                  key={item}
                  className={cn(
                    "hover:bg-muted/50 has-[:focus-visible]:ring-ring/50 flex cursor-pointer flex-col gap-0.5 rounded-lg border p-3 has-[:focus-visible]:ring-[3px]",
                    kind === item && "border-primary bg-primary/5",
                  )}
                >
                  <input type="radio" name="objective-kind" className="sr-only" checked={kind === item} onChange={() => chooseKind(item)} />
                  <span className="text-sm font-medium">{objectiveKindLabel[item]}</span>
                  <span className="text-muted-foreground text-xs">{objectiveKindHint[item]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="objective-title">Nome do objetivo</Label>
            <Input
              id="objective-title"
              value={title}
              maxLength={200}
              placeholder="Ex.: Vender 40 planos anuais até o Natal"
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          {(needsOffer || offers.length > 0) && (
            <div className="space-y-1.5">
              <Label htmlFor="objective-offer">Oferta{needsOffer ? "" : " (opcional)"}</Label>
              <select id="objective-offer" className={selectClassName} value={offerId} onChange={(event) => setOfferId(event.target.value)}>
                <option value="">{needsOffer ? "Escolha a oferta" : "Nenhuma"}</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                  </option>
                ))}
              </select>
              {needsOffer && !offersQuery.isLoading && offers.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  Cadastre a oferta em Ofertas antes: é de lá que as IAs tiram preço, provas e objeções.
                </p>
              )}
              {offerId && (metric === "SALES" || metric === "REVENUE") && (
                <p className="text-muted-foreground text-xs">Contam os negócios ganhos que têm esta oferta nos itens.</p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="objective-metric">Indicador da meta</Label>
              <select
                id="objective-metric"
                className={selectClassName}
                value={metric}
                onChange={(event) => setMetric(event.target.value as ObjectiveMetric)}
              >
                {metrics.map((item) => (
                  <option key={item} value={item}>
                    {metricLabel[item]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-target">Meta {metric === "REVENUE" ? "(R$)" : ""}</Label>
              <Input
                id="objective-target"
                inputMode="decimal"
                value={target}
                placeholder="Ex.: 40"
                onChange={(event) => setTarget(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-starts">Início</Label>
              <Input id="objective-starts" type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} />
              {!objective && <p className="text-muted-foreground text-xs">Vazio começa hoje.</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-deadline">Prazo</Label>
              <Input id="objective-deadline" type="date" value={deadline} onChange={(event) => setDeadline(event.target.value)} />
              <p className="text-muted-foreground text-xs">Com meta e prazo, a tela mostra se está no ritmo.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-budget">Verba mensal de anúncios (R$)</Label>
              <Input
                id="objective-budget"
                inputMode="decimal"
                value={monthlyBudget}
                placeholder="Opcional"
                onChange={(event) => setMonthlyBudget(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="objective-priority">Prioridade</Label>
              <select
                id="objective-priority"
                className={selectClassName}
                value={priority}
                onChange={(event) => setPriority(event.target.value as ObjectivePriority)}
              >
                <option value="PRIMARY">Principal</option>
                <option value="SECONDARY">Secundário</option>
              </select>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Frentes que trabalham no objetivo</legend>
            <div className="flex flex-col gap-2">
              {frontOrder
                .filter((front) => fronts.includes(front) || chosenFronts.includes(front))
                .map((front) => (
                  <label key={front} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={chosenFronts.includes(front)} onCheckedChange={(checked) => toggleFront(front, checked === true)} />
                    {frontInfo[front].label}
                  </label>
                ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="objective-description">Contexto para as IAs (opcional)</Label>
            <textarea
              id="objective-description"
              className={textareaClassName}
              value={description}
              maxLength={3000}
              placeholder="Ex.: dezembro é o mês mais forte; o público são clínicas pequenas; já testamos desconto e não funcionou."
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
        </form>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="objective-form" disabled={!canSave || save.isPending}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {objective ? "Salvar" : "Criar objetivo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
