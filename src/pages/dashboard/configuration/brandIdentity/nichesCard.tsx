import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { socialTextareaClassName } from "@/pages/dashboard/posts/postsUtils";
import { brandIdentityService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

const MAX_NICHES = 3;

const ROLE_LABEL: Record<NicheRole, string> = { MAIN: "Principal", SECONDARY: "Secundário", TEST: "Em teste" };

const SCORE_LABEL: { key: keyof NicheScores; label: string }[] = [
  { key: "pain", label: "dor" },
  { key: "purchasingPower", label: "poder de compra" },
  { key: "reach", label: "fácil de alcançar" },
  { key: "growth", label: "crescimento" },
];

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const emptyNiche = (role: NicheRole): BrandNiche => ({
  name: "",
  role,
  who: "",
  pain: "",
  desire: "",
  objections: [],
  words: [],
  region: "",
  angles: [],
  evidence: "",
  scores: null,
});

// Listas editadas uma por linha
const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string, max: number) =>
  text
    .split("\n")
    .map((line) => line.trimStart())
    .slice(0, max);
const cleanList = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

/** Nichos: para quem a empresa anuncia. Entram em toda IA de anúncio, criativo, postagem, estratégia e no maestro. */
export const NichesCard: FC<{ niches: BrandNiche[] }> = ({ niches: saved }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [niches, setNiches] = useState<BrandNiche[]>(saved);
  const canEdit = can("brand.manage");
  const valid = niches.every((niche) => niche.name.trim() && niche.who.trim() && niche.pain.trim());

  const suggest = useMutation({
    mutationFn: () => brandIdentityService.suggestNiches(client.id),
    onError: requestErrorHandling,
    onSuccess: (suggested) => {
      setNiches(suggested);
      toast.success("Nichos sugeridos. Revise e salve.");
    },
  });
  const save = useMutation({
    mutationFn: () =>
      brandIdentityService.saveNiches(
        client.id,
        niches.map((niche) => ({
          ...niche,
          objections: cleanList(niche.objections),
          words: cleanList(niche.words),
          angles: cleanList(niche.angles),
        })),
      ),
    onError: requestErrorHandling,
    onSuccess: (brand) => {
      setNiches(brand.niches ?? []);
      queryClient.setQueryData(["brandIdentity", client.id], brand);
      toast.success("Nichos salvos");
    },
  });

  const update = (index: number, changes: Partial<BrandNiche>) =>
    setNiches((current) =>
      current.map((niche, position) => {
        if (position === index) return { ...niche, ...changes };
        // Só um principal: escolher outro rebaixa o anterior
        return changes.role === "MAIN" && niche.role === "MAIN" ? { ...niche, role: "SECONDARY" } : niche;
      }),
    );

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-3 space-y-0 sm:flex-row">
        <div className="space-y-1.5">
          <CardTitle>Nichos</CardTitle>
          <CardDescription>
            Para quem a empresa anuncia: um nicho principal e até dois secundários ou em teste. Os anúncios, criativos, postagens,
            estratégias e o maestro escrevem para estes nichos, com a dor e as palavras de cada um.
          </CardDescription>
        </div>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => suggest.mutate()} disabled={suggest.isPending}>
            {suggest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Sugerir com IA
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {niches.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Nenhum nicho ainda. A IA sugere pelo que a empresa já vende (negócios do CRM, conversas e ofertas) ou pela base da marca.
          </p>
        )}
        {niches.map((niche, index) => {
          const id = `niche-${index}`;
          return (
            <fieldset key={niche.id ?? index} className="grid gap-3 rounded-lg border p-3">
              <legend className="sr-only">Nicho {index + 1}</legend>
              <div className="grid gap-2 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
                <div className="grid min-w-0 gap-1.5">
                  <Label htmlFor={`${id}-name`}>Nicho</Label>
                  <Input
                    id={`${id}-name`}
                    value={niche.name}
                    maxLength={120}
                    placeholder="Ex.: Aposentados do INSS que querem quitar dívidas"
                    disabled={!canEdit}
                    onChange={(event) => update(index, { name: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`${id}-role`}>Papel</Label>
                  <select
                    id={`${id}-role`}
                    className={selectClassName}
                    value={niche.role}
                    disabled={!canEdit}
                    onChange={(event) => update(index, { role: event.target.value as NicheRole })}
                  >
                    {(Object.keys(ROLE_LABEL) as NicheRole[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABEL[role]}
                      </option>
                    ))}
                  </select>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover o nicho ${niche.name || index + 1}`}
                    onClick={() => setNiches((current) => current.filter((_, position) => position !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <NicheText
                  id={`${id}-who`}
                  label="Quem é"
                  hint="Perfil e momento"
                  value={niche.who}
                  maxLength={500}
                  disabled={!canEdit}
                  onChange={(who) => update(index, { who })}
                />
                <NicheText
                  id={`${id}-pain`}
                  label="Dor"
                  hint="O problema urgente"
                  value={niche.pain}
                  maxLength={500}
                  disabled={!canEdit}
                  onChange={(pain) => update(index, { pain })}
                />
                <NicheText
                  id={`${id}-desire`}
                  label="Desejo"
                  hint="O resultado que ele quer"
                  value={niche.desire}
                  maxLength={500}
                  disabled={!canEdit}
                  onChange={(desire) => update(index, { desire })}
                />
                <div className="grid content-start gap-1.5">
                  <Label htmlFor={`${id}-region`}>Região</Label>
                  <Input
                    id={`${id}-region`}
                    value={niche.region}
                    maxLength={200}
                    placeholder="Ex.: Campinas e região; vazio = onde a empresa atende"
                    disabled={!canEdit}
                    onChange={(event) => update(index, { region: event.target.value })}
                  />
                </div>
                <NicheText
                  id={`${id}-objections`}
                  label="Objeções"
                  hint="Uma por linha, até 5"
                  value={toLines(niche.objections)}
                  disabled={!canEdit}
                  onChange={(text) => update(index, { objections: fromLines(text, 5) })}
                />
                <NicheText
                  id={`${id}-words`}
                  label="Palavras do cliente"
                  hint="Como ele fala, uma por linha, até 10"
                  value={toLines(niche.words)}
                  disabled={!canEdit}
                  onChange={(text) => update(index, { words: fromLines(text, 10) })}
                />
                <NicheText
                  id={`${id}-angles`}
                  label="Ângulos de anúncio"
                  hint="Formas de abordar, uma por linha, até 4"
                  value={toLines(niche.angles)}
                  disabled={!canEdit}
                  onChange={(text) => update(index, { angles: fromLines(text, 4) })}
                />
                <NicheText
                  id={`${id}-evidence`}
                  label="Por que este nicho"
                  hint="Dados ou hipótese"
                  value={niche.evidence}
                  maxLength={800}
                  disabled={!canEdit}
                  onChange={(evidence) => update(index, { evidence })}
                />
              </div>

              {niche.scores && (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-muted-foreground">Avaliação da IA (1 a 5):</span>
                  {SCORE_LABEL.map(({ key, label }) => (
                    <Badge key={key} variant="secondary">
                      {label} {niche.scores![key]}
                    </Badge>
                  ))}
                </div>
              )}
            </fieldset>
          );
        })}
        {canEdit && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setNiches((current) => [...current, emptyNiche(current.length ? "TEST" : "MAIN")])}
              disabled={niches.length >= MAX_NICHES}
            >
              <Plus className="h-4 w-4" />
              Adicionar nicho
            </Button>
            <div className="flex items-center gap-3">
              {!valid && <span className="text-muted-foreground text-xs">Preencha nome, quem é e dor de cada nicho.</span>}
              <Button size="sm" onClick={() => save.mutate()} disabled={!valid || save.isPending}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar nichos
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const NicheText: FC<{
  id: string;
  label: string;
  hint: string;
  value: string;
  maxLength?: number;
  disabled: boolean;
  onChange: (value: string) => void;
}> = ({ id, label, hint, value, maxLength, disabled, onChange }) => (
  <div className="grid content-start gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <textarea
      id={id}
      className={socialTextareaClassName}
      rows={3}
      maxLength={maxLength}
      aria-describedby={`${id}-hint`}
      disabled={disabled}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    <span id={`${id}-hint`} className="text-muted-foreground text-xs">
      {hint}
    </span>
  </div>
);
