import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { budgetLabel } from "../adsUtils";

type Props = {
  accountId: string;
  level: "campaign" | "adset";
  metaId: string;
  // Como a estrutura sincronizada guarda: em centavos
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  currency: string;
  // Texto quando o item não tem orçamento próprio (ex.: o orçamento fica no conjunto)
  emptyLabel?: string;
};

/**
 * Orçamento diário com edição direta: aplica na hora na Meta, dentro das travas (horário e limite de aumento em 24
 * horas), e fica no histórico de mudanças com desfazer. Orçamento total não é editado por aqui.
 */
export const AdBudgetEditor: FC<Props> = ({ accountId, level, metaId, dailyBudget, lifetimeBudget, currency, emptyLabel = "—" }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState("");
  const label = budgetLabel({ dailyBudget, lifetimeBudget }, currency);

  const setBudget = useMutation({
    mutationFn: (amount: number) =>
      metaAdsService.setBudget({ params: { clientId: client.id, accountId }, body: { level, metaId, dailyBudget: amount } }),
    onError: requestErrorHandling,
    onSuccess: (change) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      if (change.status === "APPLIED") {
        toast.success("Orçamento atualizado na Meta");
        setIsOpen(false);
      } else toast.error(change.error ?? "A Meta não aplicou a mudança", { description: "Veja na aba Mudanças." });
    },
  });

  // Sem permissão ou sem orçamento diário próprio, só mostra
  if (!can("ads.approve") || dailyBudget === null)
    return <>{label ?? <span className="text-muted-foreground text-xs">{emptyLabel}</span>}</>;

  const amount = Number(value.replace(",", "."));
  const isValid = amount >= 1;

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (open) setValue(String(dailyBudget / 100).replace(".", ","));
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted inline-flex items-center gap-1 rounded px-1 py-0.5"
          title="Editar orçamento diário"
          // As linhas da tabela abrem e fecham no clique
          onClick={(event) => event.stopPropagation()}
        >
          {label}
          <Pencil className="text-muted-foreground h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-2" onClick={(event) => event.stopPropagation()}>
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (isValid) setBudget.mutate(Math.round(amount * 100) / 100);
          }}
        >
          <Label htmlFor={`budget-${metaId}`} className="text-xs">
            Orçamento diário ({currency})
          </Label>
          <Input id={`budget-${metaId}`} inputMode="decimal" autoFocus value={value} onChange={(event) => setValue(event.target.value)} />
          <p className="text-muted-foreground text-[11px]">
            Aplica na hora na Meta. As travas valem: horário permitido e aumento máximo em 24 horas.
          </p>
          <Button type="submit" size="sm" className="w-full" disabled={!isValid || setBudget.isPending}>
            {setBudget.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar orçamento
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
};
