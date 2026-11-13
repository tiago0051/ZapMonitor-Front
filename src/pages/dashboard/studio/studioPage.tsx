import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { ArrowLeft, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { StudioDestinations } from "./studioDestinations";
import { StudioNewForm } from "./studioNewForm";
import { StudioProjectList } from "./studioProjectList";
import { StudioWorkspace } from "./studioWorkspace";

/** Lista de criativos do estúdio. */
export const StudioPage = () => {
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Estúdio de criativos</h1>
          <p className="text-muted-foreground text-sm">
            Imagens e vídeos para anúncios e postagens: escreva as instruções, envie as fotos do produto e peça alterações até ficar do
            jeito certo.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Novo criativo
        </Button>
      </div>

      <StudioProjectList onOpen={(id) => navigate(`${baseUrl}/studio/${id}`)} />

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo criativo</DialogTitle>
            <DialogDescription>A IA cria a partir das suas instruções e das imagens base, no visual da sua marca.</DialogDescription>
          </DialogHeader>
          <StudioNewForm onCreated={(project) => navigate(`${baseUrl}/studio/${project.id}`)} onCancel={() => setCreating(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Um criativo aberto, com os destinos (anúncio e postagem). */
export const StudioProjectPage = () => {
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const { projectId } = useParams();

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <Button variant="ghost" size="sm" className="self-start justify-self-start" asChild>
        <Link to={`${baseUrl}/studio`}>
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Estúdio de criativos
        </Link>
      </Button>
      {projectId && (
        <StudioWorkspace
          key={projectId}
          projectId={projectId}
          onDeleted={() => navigate(`${baseUrl}/studio`)}
          renderActions={(generation, project) => <StudioDestinations project={project} generation={generation} />}
        />
      )}
    </div>
  );
};
