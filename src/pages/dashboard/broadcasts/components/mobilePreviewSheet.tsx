import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Eye } from "lucide-react";
import type { FC, ReactNode } from "react";

/**
 * Botão "Ver prévia" para telas menores que lg, onde a prévia lateral não aparece.
 * Abre a prévia em uma gaveta de baixo, com rolagem própria.
 */
export const MobilePreviewSheet: FC<{ children: ReactNode; description?: string; className?: string }> = ({
  children,
  description,
  className,
}) => (
  <Sheet>
    <SheetTrigger asChild>
      <Button type="button" variant="outline" size="sm" className={cn("lg:hidden", className)}>
        <Eye className="h-4 w-4" />
        Ver prévia
      </Button>
    </SheetTrigger>
    <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-y-auto">
      <SheetHeader className="pr-10">
        <SheetTitle>Prévia</SheetTitle>
        {description && <SheetDescription>{description}</SheetDescription>}
      </SheetHeader>
      <div className="px-4 pb-6">{children}</div>
    </SheetContent>
  </Sheet>
);
