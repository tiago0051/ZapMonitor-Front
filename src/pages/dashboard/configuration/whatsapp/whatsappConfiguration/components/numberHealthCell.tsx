import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatMessagingLimit, isWhatsappWeb, whatsappQualityInfo } from "@/utils/whatsappConfiguration";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import type { FC } from "react";

/**
 * Qualidade e limite de conversas do número na Meta. Toque no selo explica o que significa (tooltip não funciona no
 * celular). Números por QR code não têm esses dados.
 */
export const NumberHealthCell: FC<{ configuration: WhatsappConfiguration }> = ({ configuration }) => {
  if (isWhatsappWeb(configuration)) return <span className="text-muted-foreground text-sm">—</span>;

  const { qualityRating, healthCheckedAt, healthError } = configuration;
  if (!healthCheckedAt) return <span className="text-muted-foreground text-sm">Consultando a Meta...</span>;

  const quality = whatsappQualityInfo[qualityRating ?? "UNKNOWN"] ?? whatsappQualityInfo.UNKNOWN;
  const limit = formatMessagingLimit(configuration);

  return (
    <div className="flex flex-col items-start gap-1">
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" aria-label={`Qualidade ${quality.label}: o que significa?`} className="rounded-md">
            <Badge variant="outline" className={cn("cursor-pointer", quality.className)}>
              Qualidade {quality.label.toLowerCase()}
            </Badge>
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" className="w-72 space-y-2 p-3 text-xs">
          <p>{quality.hint}</p>
          <p className="text-muted-foreground">
            O limite é quantas pessoas diferentes o número pode chamar primeiro (por modelo de mensagem) em 24 horas. Respostas a quem
            escreveu não contam. A Meta aumenta o limite quando a qualidade se mantém boa.
          </p>
          {healthError && (
            <p className="text-destructive">Última consulta à Meta falhou: {healthError}. Mostrando os últimos dados conhecidos.</p>
          )}
          <p className="text-muted-foreground">Atualizado em {format(new Date(healthCheckedAt), "dd/MM/yyyy HH:mm")}.</p>
        </PopoverContent>
      </Popover>
      {limit && <span className="text-muted-foreground text-xs">{limit}</span>}
      {healthError && (
        <span className="text-destructive flex items-center gap-1 text-xs">
          <AlertCircle className="h-3 w-3" /> Não foi possível consultar a Meta
        </span>
      )}
    </div>
  );
};
