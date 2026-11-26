import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { artAgendaService } from "@/services/api/artAgendaService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

const MIN_PILLARS = 3;
const MAX_PILLARS = 5;
const emptyPillar = (): ContentPillar => ({ name: "", description: "", share: 20 });

/** Pilares de conteúdo: os temas fixos que as postagens e a pauta de artes revezam, com a fatia de cada um. */
export const ContentPillarsCard: FC<{ pillars: ContentPillar[] }> = ({ pillars: saved }) => {
  const { client, can, access } = useClientContext();
  const queryClient = useQueryClient();
  const [pillars, setPillars] = useState<ContentPillar[]>(saved.length ? saved : []);
  const canEdit = can("brand.manage") && access.organicEnabled;
  const total = pillars.reduce((sum, pillar) => sum + (Number(pillar.share) || 0), 0);
  const valid = pillars.length >= MIN_PILLARS && pillars.length <= MAX_PILLARS && pillars.every((pillar) => pillar.name.trim());

  const suggest = useMutation({
    mutationFn: () => artAgendaService.suggestPillars(client.id),
    onError: requestErrorHandling,
    onSuccess: (suggested) => {
      setPillars(suggested);
      toast.success("Pilares sugeridos. Revise e salve.");
    },
  });
  const save = useMutation({
    mutationFn: () => artAgendaService.savePillars(client.id, pillars),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      setPillars(result);
      queryClient.invalidateQueries({ queryKey: ["brandIdentity", client.id] });
      toast.success("Pilares salvos");
    },
  });

  const update = (index: number, changes: Partial<ContentPillar>) =>
    setPillars((current) => current.map((pillar, position) => (position === index ? { ...pillar, ...changes } : pillar)));

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 sm:flex-row">
        <div className="space-y-1.5">
          <CardTitle>Pilares de conteúdo</CardTitle>
          <CardDescription>
            De 3 a 5 temas fixos que as postagens revezam (ex.: educativo, prova social, bastidores, oferta). A pauta de artes segue as
            fatias; a IA usa os pilares ao escrever qualquer postagem.
          </CardDescription>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => suggest.mutate()} disabled={suggest.isPending}>
            {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Sugerir com IA
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {pillars.length === 0 && <p className="text-muted-foreground text-sm">Nenhum pilar ainda. Peça uma sugestão à IA ou adicione.</p>}
        {pillars.map((pillar, index) => (
          <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_6rem_auto] sm:items-start">
            <div className="grid min-w-0 gap-2">
              <Input
                aria-label={`Nome do pilar ${index + 1}`}
                value={pillar.name}
                maxLength={60}
                placeholder="Nome do pilar"
                disabled={!canEdit}
                onChange={(event) => update(index, { name: event.target.value })}
              />
              <Input
                aria-label={`O que entra no pilar ${index + 1}`}
                value={pillar.description}
                maxLength={400}
                placeholder="O que entra neste pilar"
                disabled={!canEdit}
                onChange={(event) => update(index, { description: event.target.value })}
              />
            </div>
            <div className="flex items-center gap-1">
              <Input
                aria-label={`Fatia do pilar ${index + 1} em porcentagem`}
                type="number"
                min={0}
                max={100}
                value={pillar.share}
                disabled={!canEdit}
                onChange={(event) => update(index, { share: Number(event.target.value) })}
              />
              <span className="text-muted-foreground text-sm">%</span>
            </div>
            {canEdit && (
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover o pilar ${pillar.name || index + 1}`}
                onClick={() => setPillars((current) => current.filter((_, position) => position !== index))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPillars((current) => [...current, emptyPillar()])}
              disabled={pillars.length >= MAX_PILLARS}
            >
              <Plus className="h-4 w-4" />
              Adicionar pilar
            </Button>
            <div className="flex items-center gap-3">
              {pillars.length > 0 && total !== 100 && (
                <span className="text-muted-foreground text-xs">Soma {total}%: ao salvar, as fatias são ajustadas para 100%.</span>
              )}
              <Button size="sm" onClick={() => save.mutate()} disabled={!valid || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar pilares
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
