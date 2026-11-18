import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ClipboardCopy, HelpCircle } from "lucide-react";
import { type FC } from "react";
import { toast } from "sonner";
import { copyText } from "./strategyUtils";

/** A marca no nome fica escondida aqui: só quem cria campanha fora do sistema precisa dela. */
export const StrategyMarkerHelp: FC<{ marker: string; isStep?: boolean }> = ({ marker, isStep }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button type="button" className="text-muted-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline">
        <HelpCircle className="h-3.5 w-3.5" aria-hidden />
        Como as campanhas são ligadas?
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" className="w-80 space-y-2 text-sm">
      <p>O que você cria pelo piloto ou pelos botões {isStep ? "deste passo" : "da estratégia"} já nasce ligado e entra nos resultados.</p>
      <p>
        Campanha feita direto no Gerenciador de Anúncios? Ligue à mão em Resultados ou comece o nome dela com a marca abaixo: na próxima
        atualização ela é ligada sozinha.
      </p>
      <div className="flex items-center gap-2">
        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">{marker}</code>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            if (await copyText(marker)) toast.success("Marca copiada");
          }}
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copiar
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">Depois de ligada, a campanha continua ligada mesmo se você mudar o nome.</p>
    </PopoverContent>
  </Popover>
);
