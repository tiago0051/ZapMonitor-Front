import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";
import { useState, type FC } from "react";
import { StudioNewForm } from "./studioNewForm";
import { StudioProjectList } from "./studioProjectList";
import { StudioWorkspace } from "./studioWorkspace";

type CreativeStudioDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  defaults?: CreativeProjectDefaults;
  // Texto do botão que usa a versão escolhida (ex.: "Usar na postagem")
  pickLabel: string;
  onPick: (generation: CreativeGeneration) => Promise<unknown>;
  // Abre direto no formulário de criativo novo
  startNew?: boolean;
};

/** Estúdio de criativos dentro de outra tela: escolhe ou cria um criativo e usa a versão escolhida ali mesmo. */
export const CreativeStudioDialog: FC<CreativeStudioDialogProps> = ({
  open,
  onOpenChange,
  title = "Estúdio de criativos",
  description = "Crie imagens ou vídeos com a IA a partir das suas instruções e das fotos do produto, peça alterações e use a versão que ficar melhor.",
  ...body
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-5xl">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      {/* O conteúdo só existe com a janela aberta: cada abertura começa na lista (ou no criativo novo) */}
      {open && <StudioDialogBody {...body} onClose={() => onOpenChange(false)} />}
    </DialogContent>
  </Dialog>
);

const StudioDialogBody: FC<Pick<CreativeStudioDialogProps, "defaults" | "pickLabel" | "onPick" | "startNew"> & { onClose: () => void }> = ({
  defaults,
  pickLabel,
  onPick,
  startNew,
  onClose,
}) => {
  const [view, setView] = useState<"list" | "new" | string>(startNew ? "new" : "list");
  const [picking, setPicking] = useState<string | null>(null);

  const pick = async (generation: CreativeGeneration) => {
    setPicking(generation.id);
    try {
      await onPick(generation);
      onClose();
    } catch {
      // O chamador já mostrou o erro; o estúdio continua aberto
    } finally {
      setPicking(null);
    }
  };

  return (
    <>
      {view === "list" && (
        <div className="grid gap-3">
          <Button className="justify-self-start" onClick={() => setView("new")}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Novo criativo
          </Button>
          <StudioProjectList onOpen={setView} kind={defaults?.lockKind ? defaults.kind : undefined} />
        </div>
      )}

      {view === "new" && (
        <StudioNewForm defaults={defaults} onCreated={(project) => setView(project.id)} onCancel={() => setView("list")} />
      )}

      {view !== "list" && view !== "new" && (
        <div className="grid gap-3">
          <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setView("list")}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Todos os criativos
          </Button>
          <StudioWorkspace
            key={view}
            projectId={view}
            onDeleted={() => setView("list")}
            renderActions={(generation) =>
              defaults?.lockKind && defaults.kind && generation.kind !== defaults.kind ? (
                <p className="text-muted-foreground text-sm">Aqui só dá para usar {defaults.kind === "VIDEO" ? "vídeo" : "imagem"}.</p>
              ) : (
                <Button disabled={!!picking} onClick={() => pick(generation)}>
                  {picking === generation.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Check className="mr-2 h-4 w-4" aria-hidden />
                  )}
                  {picking === generation.id ? "Enviando..." : pickLabel}
                </Button>
              )
            }
          />
        </div>
      )}
    </>
  );
};
