import { DisabledReason } from "@/components/disabled-reason";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type ReactNode } from "react";
import { toast } from "sonner";
import { effectiveStatusInfo } from "../adsUtils";
import {
  DEFAULT_DAYS,
  diaryQueryKey,
  experimentLevelLabel,
  experimentOptions,
  experimentsQueryKey,
  MAX_ARMS,
  MAX_DAYS,
  MIN_ARMS,
  MIN_DAYS,
} from "./experimentsUtils";

const textarea = "border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm";

type Props = { account: AdAccount; open: boolean; onOpenChange: (open: boolean) => void };

const Frame: FC<Props & { children: ReactNode }> = ({ open, onOpenChange, children }) => {
  const isMobile = useIsMobile();
  const title = "Novo teste";
  const description = "Escolha de 2 a 4 conjuntos ou anúncios que já estão rodando para comparar pelo custo por venda.";

  if (isMobile)
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-4">{children}</div>
        </SheetContent>
      </Sheet>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
};

/** Formulário do teste: nome, hipótese, o que compara e por quantos dias. */
const NewExperimentForm: FC<{ account: AdAccount; onDone: () => void }> = ({ account, onDone }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [level, setLevel] = useState<AdExperimentLevel>("AD_SET");
  const [metaIds, setMetaIds] = useState<string[]>([]);
  const [days, setDays] = useState(DEFAULT_DAYS);

  // Mesma consulta da aba Campanhas
  const structureQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "structure", client.id, account.id],
    queryFn: () => metaAdsService.findStructure({ params: { clientId: client.id, accountId: account.id } }),
  });
  const options = experimentOptions(structureQuery.data, level);
  const groups = [...new Set(options.map((option) => option.group))];

  const create = useMutation({
    mutationFn: metaAdsService.createExperiment,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: experimentsQueryKey(client.id, account.id) });
      queryClient.invalidateQueries({ queryKey: diaryQueryKey(client.id, account.id) });
      queryClient.invalidateQueries({ queryKey: ["metaAds", "changes", client.id, account.id] });
      toast.success("Teste criado. A primeira avaliação sai em até um dia.");
      onDone();
    },
  });

  const toggle = (metaId: string) =>
    setMetaIds((ids) => (ids.includes(metaId) ? ids.filter((id) => id !== metaId) : ids.length < MAX_ARMS ? [...ids, metaId] : ids));
  const changeLevel = (value: AdExperimentLevel) => {
    setLevel(value);
    setMetaIds([]);
  };

  const validDays = Number.isInteger(days) && days >= MIN_DAYS && days <= MAX_DAYS;
  const disabledReason = !name.trim()
    ? "Dê um nome ao teste."
    : !hypothesis.trim()
      ? "Escreva o que você quer descobrir."
      : metaIds.length < MIN_ARMS
        ? `Escolha pelo menos ${MIN_ARMS} ${level === "AD_SET" ? "conjuntos" : "anúncios"} (faltam ${MIN_ARMS - metaIds.length}).`
        : !validDays
          ? `O prazo vai de ${MIN_DAYS} a ${MAX_DAYS} dias.`
          : null;
  const levelNoun = level === "AD_SET" ? "conjuntos" : "anúncios";

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (disabledReason) return;
        create.mutate({
          params: { clientId: client.id, accountId: account.id },
          body: { name: name.trim(), hypothesis: hypothesis.trim(), level, metaIds, days },
        });
      }}
    >
      <div className="grid gap-1">
        <Label htmlFor="experiment-name">Nome</Label>
        <Input
          id="experiment-name"
          maxLength={200}
          placeholder="Preço x dor"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="experiment-hypothesis">O que você quer descobrir (hipótese)</Label>
        <textarea
          id="experiment-hypothesis"
          className={textarea}
          maxLength={2000}
          placeholder="O anúncio com preço vende com menor custo por venda que o de dor"
          value={hypothesis}
          onChange={(event) => setHypothesis(event.target.value)}
        />
      </div>

      <fieldset className="grid gap-1">
        <legend className="mb-1 text-sm font-medium">O que comparar</legend>
        <div role="radiogroup" className="bg-muted inline-flex w-max rounded-lg p-0.5">
          {(Object.keys(experimentLevelLabel) as AdExperimentLevel[]).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={level === option}
              onClick={() => changeLevel(option)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                level === option ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {experimentLevelLabel[option]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <p className="text-sm font-medium">
          Escolha de {MIN_ARMS} a {MAX_ARMS} {levelNoun}{" "}
          <span className="text-muted-foreground font-normal">
            ({metaIds.length} de {MAX_ARMS})
          </span>
        </p>
        {structureQuery.isLoading ? (
          <LoadingState />
        ) : structureQuery.isError ? (
          <ErrorState
            message="Não foi possível carregar as campanhas."
            onRetry={() => structureQuery.refetch()}
            isRetrying={structureQuery.isFetching}
          />
        ) : options.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum {level === "AD_SET" ? "conjunto" : "anúncio"} nesta conta. Sincronize a conta e tente de novo.
          </p>
        ) : (
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border p-2">
            {groups.map((group) => (
              <div key={group} className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{group}</p>
                {options
                  .filter((option) => option.group === group)
                  .map((option) => {
                    const checked = metaIds.includes(option.metaId);
                    const isFull = !checked && metaIds.length >= MAX_ARMS;
                    return (
                      <label
                        key={option.metaId}
                        className={cn(
                          "flex items-center gap-2 rounded px-1 py-1 text-sm",
                          isFull ? "opacity-50" : "hover:bg-muted/50 cursor-pointer",
                        )}
                      >
                        <Checkbox checked={checked} disabled={isFull} onCheckedChange={() => toggle(option.metaId)} />
                        <span className="min-w-0 flex-1 truncate">{option.label}</span>
                        <span className="text-muted-foreground shrink-0 text-xs">{effectiveStatusInfo(option.effectiveStatus).label}</span>
                      </label>
                    );
                  })}
              </div>
            ))}
          </div>
        )}
        {metaIds.length >= MAX_ARMS && (
          <p className="text-muted-foreground text-xs">Limite de {MAX_ARMS} atingido. Desmarque um para trocar.</p>
        )}
      </div>

      <div className="grid gap-1">
        <Label htmlFor="experiment-days">Prazo (dias)</Label>
        <Input
          id="experiment-days"
          type="number"
          min={MIN_DAYS}
          max={MAX_DAYS}
          className="w-28"
          value={Number.isNaN(days) ? "" : days}
          onChange={(event) => setDays(event.target.valueAsNumber)}
        />
        <p className="text-muted-foreground text-xs">Se ninguém vencer até lá, o teste termina sem vencedor. O comum é 14 dias.</p>
      </div>

      <div className="space-y-2">
        <DisabledReason>{disabledReason}</DisabledReason>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!!disabledReason || create.isPending}>
            {create.isPending ? "Criando…" : "Criar teste"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export const NewExperimentDialog: FC<Props> = (props) => (
  <Frame {...props}>{props.open && <NewExperimentForm account={props.account} onDone={() => props.onOpenChange(false)} />}</Frame>
);
