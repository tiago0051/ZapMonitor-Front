import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Monitor, Smartphone } from "lucide-react";
import { useState, type FC } from "react";

type EmailPreviewFrameProps = {
  subject?: string;
  html?: string;
  isLoading?: boolean;
  note?: string;
  className?: string;
};

/** O e-mail renderizado pelo servidor, no computador ou no celular. */
export const EmailPreviewFrame: FC<EmailPreviewFrameProps> = ({ subject, html, isLoading, note, className }) => {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground truncate text-xs">{note ?? "Prévia"}</p>
        <div className="hidden gap-1 md:flex" role="group" aria-label="Tamanho da prévia">
          <Button
            size="icon"
            variant={device === "desktop" ? "secondary" : "ghost"}
            className="h-7 w-7"
            aria-label="Computador"
            aria-pressed={device === "desktop"}
            onClick={() => setDevice("desktop")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant={device === "mobile" ? "secondary" : "ghost"}
            className="h-7 w-7"
            aria-label="Celular"
            aria-pressed={device === "mobile"}
            onClick={() => setDevice("mobile")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <p className="bg-muted/50 truncate border-b px-3 py-2 text-sm">
          <span className="text-muted-foreground">Assunto: </span>
          {isLoading ? "carregando..." : subject || "sem assunto"}
        </p>
        <div className="bg-muted/30 flex justify-center">
          <iframe
            title="Prévia do e-mail"
            sandbox=""
            srcDoc={html ?? ""}
            className={cn("h-[560px] border-0 bg-white", device === "mobile" ? "w-full md:w-[375px]" : "w-full")}
          />
        </div>
      </div>
    </div>
  );
};
