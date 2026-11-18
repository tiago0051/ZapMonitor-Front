import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useMediaQuota, type MediaQuotaScope } from "./mediaQuotaUtils";

/** "Hoje: 7 de 40 imagens · 1 de 3 vídeos", com aviso de cor quando está acabando. */
export const MediaQuotaMeter: FC<{ scope: MediaQuotaScope; show?: "both" | "image" | "video"; className?: string }> = ({
  scope,
  show = "both",
  className,
}) => {
  const { usage } = useMediaQuota(scope);
  if (!usage) return null;

  const part = (count: MediaQuotaCount, singular: string, plural: string) => {
    const left = count.max - count.used;
    return (
      <span
        className={cn(
          left <= 0 ? "text-destructive font-medium" : left <= Math.ceil(count.max * 0.2) && "text-amber-700 dark:text-amber-400",
        )}
      >
        {count.used} de {count.max} {count.max === 1 ? singular : plural}
      </span>
    );
  };

  return (
    <p
      className={cn("text-muted-foreground text-xs", className)}
      title="Quantidade gerada pela IA nas últimas 24 horas; o limite protege a sua cota e libera aos poucos"
    >
      Hoje: {show !== "video" && part(usage.images, "imagem", "imagens")}
      {show === "both" && " · "}
      {show !== "image" && part(usage.videos, "vídeo", "vídeos")}
    </p>
  );
};
