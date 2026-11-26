import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { artAgendaService } from "@/services/api/artAgendaService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarClock, Loader2, Palette, Settings2, Sparkles } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { selectClassName, textareaClassName } from "../strategies/strategyUtils";
import { socialApprovalInfo, socialFormatLabel, socialPlatformLabel, socialStatusInfo } from "./postsUtils";

// Alterações por arte que não consomem a cota
const FREE_REVISIONS = 2;
const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const artFormats: SocialPostFormat[] = ["IMAGE", "CAROUSEL", "STORY"];
const platforms: SocialPlatform[] = ["INSTAGRAM", "FACEBOOK"];

const agendaStatusText: Record<ArtAgendaStatus, string> = {
  GENERATING: "A IA está escolhendo os temas e criando as artes...",
  READY: "Pronta",
  FAILED: "Falhou",
  SKIPPED: "Pulada",
};

/** Pauta de artes da semana: a IA cria as artes da cota do plano e elas esperam aprovação para sair no dia previsto. */
export const ArtAgendaPanel = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [week, setWeek] = useState<"current" | "next">("next");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [revising, setRevising] = useState<SocialPost | null>(null);

  const query = useQuery({
    queryKey: ["artAgenda", client.id, week],
    queryFn: () => artAgendaService.findWeek(client.id, week),
    refetchInterval: (current) =>
      current.state.data?.agenda?.status === "GENERATING" || current.state.data?.posts.some((post) => post.status === "GENERATING")
        ? 5000
        : false,
  });
  const data = query.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["artAgenda", client.id] });

  const generate = useMutation({
    mutationFn: () => artAgendaService.requestAgenda(client.id, week),
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("A IA está montando as artes. Leva alguns minutos.");
    },
  });
  const approve = useMutation({
    mutationFn: (postId: string) => artAgendaService.approve(client.id, postId),
    onError: requestErrorHandling,
    onSuccess: (post) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id] });
      toast.success(post.scheduledAt ? `Aprovada: sai em ${format(new Date(post.scheduledAt), "dd/MM 'às' HH:mm")}` : "Arte aprovada");
    },
  });

  const generating = data?.agenda?.status === "GENERATING";
  const canGenerate = can("posts.manage") && !!data && data.usage.remaining > 0 && !generating;

  return (
    <section className="grid gap-4" aria-labelledby="art-agenda">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 id="art-agenda" className="flex items-center gap-2 text-lg font-semibold">
            <Palette className="h-5 w-5" />
            Pauta de artes
          </h2>
          <p className="text-muted-foreground text-sm">
            Toda sexta, a IA escolhe os temas da semana seguinte pelos pilares da marca, datas comemorativas e a estratégia do maestro, e
            cria as artes em rascunho. Nada sai sem aprovação: aprovar agenda no dia previsto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("posts.manage") && (
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 className="h-4 w-4" />
              Dias e formatos
            </Button>
          )}
          {can("posts.manage") && (
            <Button size="sm" onClick={() => generate.mutate()} disabled={!canGenerate || generate.isPending}>
              {generate.isPending || generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {data?.agenda ? "Completar a cota" : "Gerar artes"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1" role="group" aria-label="Semana">
          {(
            [
              ["current", "Esta semana"],
              ["next", "Próxima semana"],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={week === value ? "secondary" : "ghost"}
              aria-pressed={week === value}
              onClick={() => setWeek(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        {data && (
          <span className="text-muted-foreground text-sm tabular-nums">
            Semana de {format(new Date(`${data.weekStart}T12:00:00`), "dd/MM")} · {data.usage.used} de {data.usage.quota} arte(s) da cota
          </span>
        )}
      </div>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError || !data ? (
        <ErrorState message="Não foi possível carregar a pauta" onRetry={() => query.refetch()} />
      ) : data.usage.quota === 0 ? (
        <EmptyState
          icon={Palette}
          title="O plano não inclui artes por semana"
          description="Fale com o seu implantador para incluir a pauta de artes no plano."
        />
      ) : (
        <>
          {data.agenda && data.agenda.status !== "READY" && (
            <p
              className={cn(
                "flex items-center gap-2 text-sm",
                data.agenda.status === "FAILED" ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {generating && <Loader2 className="h-4 w-4 animate-spin" />}
              {agendaStatusText[data.agenda.status]}
              {data.agenda.skippedReason && `: ${data.agenda.skippedReason}`}
              {data.agenda.error && `: ${data.agenda.error}`}
            </p>
          )}
          {data.agenda?.summary && <p className="text-sm">{data.agenda.summary}</p>}
          {data.posts.length === 0 && !generating ? (
            <EmptyState
              icon={CalendarClock}
              title="Nenhuma arte nesta semana"
              description={
                week === "next"
                  ? "A pauta da próxima semana sai sozinha na sexta, ou gere agora."
                  : "Gere agora para usar a cota que sobra nos dias que ainda faltam."
              }
            />
          ) : (
            <ArtList
              posts={data.posts}
              items={data.agenda?.items ?? []}
              onApprove={(post) => approve.mutate(post.id)}
              approving={approve.isPending ? approve.variables : null}
              onRevise={setRevising}
            />
          )}
        </>
      )}

      {settingsOpen && <ArtSettingsDialog onClose={() => setSettingsOpen(false)} />}
      {revising && (
        <ReviseArtDialog
          post={revising}
          remaining={data?.usage.remaining ?? 0}
          onClose={() => setRevising(null)}
          onDone={() => {
            setRevising(null);
            invalidate();
          }}
        />
      )}
    </section>
  );
};

const ArtList: FC<{
  posts: SocialPost[];
  items: ArtAgendaItem[];
  approving: string | null;
  onApprove: (post: SocialPost) => void;
  onRevise: (post: SocialPost) => void;
}> = ({ posts, items, approving, onApprove, onRevise }) => {
  const { can } = useClientContext();
  const baseUrl = useBaseUrl();
  const sorted = [...posts].sort((first, second) => (first.plannedFor ?? "").localeCompare(second.plannedFor ?? ""));

  return (
    <ul className="grid gap-2">
      {sorted.map((post) => {
        const item = items.find((entry) => entry.postId === post.id);
        const image = post.media.find((media) => media.url);
        const status = socialStatusInfo[post.status];
        const done = ["SCHEDULED", "PUBLISHING", "PUBLISHED", "PARTIAL"].includes(post.status);
        return (
          <li key={post.id} className="flex flex-wrap gap-3 rounded-xl border p-3">
            {image?.url ? (
              <img src={image.url} alt="" loading="lazy" className="aspect-[4/5] w-20 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="bg-muted flex aspect-[4/5] w-20 shrink-0 items-center justify-center rounded-md">
                {post.status === "GENERATING" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Palette className="text-muted-foreground h-5 w-5" />
                )}
              </div>
            )}
            <div className="grid min-w-0 flex-1 content-start gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", status.className)}>{status.label}</span>
                {post.approvalStatus && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", socialApprovalInfo[post.approvalStatus].className)}>
                    {socialApprovalInfo[post.approvalStatus].label}
                  </span>
                )}
                {post.artPillar && <Badge variant="outline">{post.artPillar}</Badge>}
              </div>
              <p className="font-medium">{post.artTheme ?? item?.theme ?? post.idea}</p>
              <p className="text-muted-foreground text-xs">
                {post.plannedFor && format(new Date(post.plannedFor), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })} ·{" "}
                {socialFormatLabel[post.format]} · {post.platforms.map((platform) => socialPlatformLabel[platform]).join(" e ")}
              </p>
              {item?.why && <p className="text-muted-foreground line-clamp-2 text-xs">Por quê: {item.why}</p>}
              <div className="mt-1 flex flex-wrap gap-2">
                {!done && can("posts.publish") && (
                  <Button size="sm" onClick={() => onApprove(post)} disabled={approving === post.id || post.status === "GENERATING"}>
                    {approving === post.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Aprovar
                  </Button>
                )}
                {!done && can("posts.manage") && (
                  <Button size="sm" variant="outline" onClick={() => onRevise(post)} disabled={post.status === "GENERATING"}>
                    Pedir alteração
                  </Button>
                )}
                <Button size="sm" variant="ghost" asChild>
                  <Link to={`${baseUrl}/posts/${post.id}`}>Abrir</Link>
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

const ReviseArtDialog: FC<{ post: SocialPost; remaining: number; onClose: () => void; onDone: () => void }> = ({
  post,
  remaining,
  onClose,
  onDone,
}) => {
  const { client } = useClientContext();
  const [instruction, setInstruction] = useState("");
  const [target, setTarget] = useState<ArtRevisionTarget>("BOTH");
  const used = post.artRevisions ?? 0;
  const free = Math.max(0, FREE_REVISIONS - used);
  const blocked = free === 0 && remaining === 0;

  const revise = useMutation({
    mutationFn: () => artAgendaService.revise(client.id, post.id, { instruction: instruction.trim(), target }),
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("A IA está refazendo a arte");
      onDone();
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    revise.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Pedir alteração</DialogTitle>
          <DialogDescription>
            {free > 0
              ? `Restam ${free} alteração(ões) inclusa(s) nesta arte.`
              : blocked
                ? "As alterações inclusas acabaram e a cota de artes da semana também."
                : "As alterações inclusas acabaram: esta consome 1 arte da cota da semana."}
          </DialogDescription>
        </DialogHeader>
        <form id="revise-art-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="revise-target">O que alterar</Label>
            <select
              id="revise-target"
              className={selectClassName}
              value={target}
              onChange={(event) => setTarget(event.target.value as ArtRevisionTarget)}
            >
              <option value="BOTH">Arte e legenda</option>
              <option value="IMAGE">Só a arte</option>
              <option value="CAPTION">Só a legenda</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="revise-instruction">O que mudar</Label>
            <textarea
              id="revise-instruction"
              className={textareaClassName}
              value={instruction}
              maxLength={1000}
              placeholder="Ex.: use uma foto mais clara do consultório e cite o parcelamento em 10x"
              onChange={(event) => setInstruction(event.target.value)}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="revise-art-form" disabled={!instruction.trim() || blocked || revise.isPending}>
            {revise.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Refazer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ArtSettingsDialog: FC<{ onClose: () => void }> = ({ onClose }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["artAgenda", client.id, "settings"], queryFn: () => artAgendaService.findSettings(client.id) });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Dias e formatos da pauta</DialogTitle>
          <DialogDescription>Em que dias e horário as artes saem, em quais redes e em que formatos a IA pode criar.</DialogDescription>
        </DialogHeader>
        {query.isLoading || !query.data ? (
          <LoadingState />
        ) : (
          <ArtSettingsForm
            settings={query.data}
            onSaved={() => {
              queryClient.invalidateQueries({ queryKey: ["artAgenda", client.id, "settings"] });
              onClose();
            }}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

const ArtSettingsForm: FC<{ settings: ArtAgendaSettings; onSaved: () => void; onCancel: () => void }> = ({
  settings,
  onSaved,
  onCancel,
}) => {
  const { client } = useClientContext();
  const [draft, setDraft] = useState(settings);
  const toggle = <T,>(list: T[], value: T, checked: boolean) =>
    checked ? [...new Set([...list, value])] : list.filter((item) => item !== value);

  const save = useMutation({
    mutationFn: () => artAgendaService.saveSettings(client.id, draft),
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("Pauta de artes atualizada");
      onSaved();
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
      className="space-y-5"
    >
      <label className="flex items-center justify-between gap-3 text-sm">
        <span>
          <span className="font-medium">Gerar sozinha toda sexta</span>
          <span className="text-muted-foreground block text-xs">Desligada, as artes só saem quando alguém pedir.</span>
        </span>
        <Switch checked={draft.enabled} onCheckedChange={(enabled) => setDraft({ ...draft, enabled })} />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Dias da semana</legend>
        <div className="flex flex-wrap gap-3">
          {weekdayLabels.map((label, day) => (
            <label key={label} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={draft.weekdays.includes(day)}
                onCheckedChange={(checked) => setDraft({ ...draft, weekdays: toggle(draft.weekdays, day, checked === true).sort() })}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="art-hour">Horário</Label>
        <select
          id="art-hour"
          className={selectClassName}
          value={draft.hour}
          onChange={(event) => setDraft({ ...draft, hour: Number(event.target.value) })}
        >
          {Array.from({ length: 17 }, (_, index) => index + 6).map((hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}:00
            </option>
          ))}
        </select>
        <p className="text-muted-foreground text-xs">Com mais artes que dias, a segunda do dia sai 3 horas depois.</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Redes</legend>
        <div className="flex flex-wrap gap-3">
          {platforms.map((platform) => (
            <label key={platform} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={draft.platforms.includes(platform)}
                onCheckedChange={(checked) => setDraft({ ...draft, platforms: toggle(draft.platforms, platform, checked === true) })}
              />
              {socialPlatformLabel[platform]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Formatos</legend>
        <div className="flex flex-wrap gap-3">
          {artFormats.map((item) => (
            <label key={item} className="flex items-center gap-1.5 text-sm">
              <Checkbox
                checked={draft.formats.includes(item)}
                onCheckedChange={(checked) => setDraft({ ...draft, formats: toggle(draft.formats, item, checked === true) })}
              />
              {socialFormatLabel[item]}
            </label>
          ))}
        </div>
      </fieldset>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={save.isPending || !draft.weekdays.length || !draft.platforms.length || !draft.formats.length}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
};
