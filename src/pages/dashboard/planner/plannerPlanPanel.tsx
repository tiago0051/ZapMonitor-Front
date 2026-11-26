import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { plannerService } from "@/services/api/plannerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, ExternalLink, Loader2, Megaphone, RotateCw, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState, type FC, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { useReadLocalStorage } from "usehooks-ts";
import { copyText } from "../strategies/strategyUtils";
import {
  eventTypeInfo,
  itemKindEventType,
  itemKindLabel,
  plannerSelectClassName,
  plannerTextareaClassName,
  postFormatLabel,
} from "./plannerUtils";

const channelOptions: { value: PlannerItemKind; label: string; requiresAds?: boolean; requiresOrganic?: boolean }[] = [
  { value: "SOCIAL_POST", label: "Postagens no Instagram e Facebook", requiresOrganic: true },
  { value: "WHATSAPP_BROADCAST", label: "Disparos de WhatsApp" },
  { value: "EMAIL_CAMPAIGN", label: "Campanhas de e-mail" },
  { value: "AD_CAMPAIGN", label: "Anúncios na Meta", requiresAds: true },
];

const goalExamples = [
  "Vender mais na Black Friday: 20% em todos os produtos de 24 a 30/11",
  "Ganhar seguidores e mostrar os bastidores da empresa",
  "Lotar a agenda de dezembro com clientes novos",
];

// Disparo e e-mail precisam de lista e modelo escolhidos na tela: o plano abre a criação com o nome e o briefing copiado
const moduleByKind: Partial<Record<PlannerItemKind, { path: string; label: string }>> = {
  WHATSAPP_BROADCAST: { path: "broadcasts/new", label: "Montar disparo" },
  EMAIL_CAMPAIGN: { path: "broadcasts/email/new", label: "Montar e-mail" },
};

const monthLabel = (month: string) => format(new Date(`${month}-01T12:00`), "MMMM 'de' yyyy", { locale: ptBR });

const PlanItemRow: FC<{ item: PlannerPlanItem; canManage: boolean; createsPosts: boolean; createsAds: boolean }> = ({
  item,
  canManage,
  createsPosts,
  createsAds,
}) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Conta de anúncio aberta por último em Anúncios: o rascunho nasce nela
  const adAccountId = useReadLocalStorage<string | null>(`ads:account:${client.id}`);
  const moduleTarget = moduleByKind[item.kind];
  const canBuildInModule = !!moduleTarget && can("broadcasts.send");
  const openModule = async () => {
    if (!moduleTarget) return;
    const copied = await copyText(item.description ? `${item.title}\n\n${item.description}` : item.title);
    if (copied) toast.success("Briefing copiado. Cole onde precisar ao montar.");
    navigate(`${baseUrl}/${moduleTarget.path}?name=${encodeURIComponent(item.title.substring(0, 191))}`);
  };
  const [day, setDay] = useState(format(new Date(item.date), "yyyy-MM-dd"));
  const info = eventTypeInfo[itemKindEventType[item.kind]];
  const Icon = info.icon;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["planner", client.id] });

  const accept = useMutation({
    mutationFn: () => plannerService.acceptItem(client.id, item.id, { adAccountId: adAccountId ?? undefined }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id] });
      if (updated.socialPostId) toast.success("A IA está escrevendo a postagem");
      else if (updated.adDraftId)
        toast.success("Rascunho do anúncio criado em Anúncios, com uma tarefa no dia para revisar e publicar", {
          action: { label: "Abrir", onClick: () => navigate(`${baseUrl}/ads?draft=${updated.adDraftId}`) },
        });
      else if (canBuildInModule && moduleTarget)
        toast.success("Virou tarefa no dia", { action: { label: moduleTarget.label, onClick: () => void openModule() } });
      else toast.success("Virou tarefa");
    },
  });
  const discard = useMutation({
    mutationFn: () => plannerService.discardItem(client.id, item.id),
    onError: requestErrorHandling,
    onSuccess: refresh,
  });
  const changeDay = useMutation({
    mutationFn: (value: string) => plannerService.updateItem(client.id, item.id, { date: new Date(`${value}T12:00`).toISOString() }),
    onError: requestErrorHandling,
    onSuccess: refresh,
  });
  const busy = accept.isPending || discard.isPending || changeDay.isPending;
  const suggested = item.status === "SUGGESTED";

  return (
    <li className={cn("grid gap-2 rounded-lg border p-3", !suggested && "opacity-70")}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium", info.className)}>
          <Icon className="h-3 w-3" aria-hidden />
          {itemKindLabel[item.kind]}
          {item.format && ` · ${postFormatLabel[item.format]}`}
        </span>
        {suggested && canManage ? (
          <Input
            type="date"
            aria-label="Dia"
            value={day}
            disabled={busy}
            className="h-7 w-auto text-xs"
            onChange={(event) => {
              setDay(event.target.value);
              if (event.target.value) changeDay.mutate(event.target.value);
            }}
          />
        ) : (
          <span className="text-muted-foreground text-xs capitalize">{format(new Date(item.date), "EEE, dd/MM", { locale: ptBR })}</span>
        )}
        {item.status === "ACCEPTED" && <span className="text-xs text-green-700 dark:text-green-400">Aceita</span>}
        {item.status === "DISCARDED" && <span className="text-muted-foreground text-xs">Descartada</span>}
      </div>
      <p className="text-sm font-medium">{item.title}</p>
      {item.strategyName && (
        <p className="text-muted-foreground text-xs">
          Da estratégia{" "}
          {item.strategyId ? (
            <Link to={`${baseUrl}/strategies/${item.strategyId}`} className="text-foreground underline-offset-2 hover:underline">
              {item.strategyName}
            </Link>
          ) : (
            item.strategyName
          )}
        </p>
      )}
      {item.description && <p className="text-muted-foreground text-sm whitespace-pre-line">{item.description}</p>}
      <div className="flex flex-wrap gap-2">
        {suggested && canManage && (
          <>
            <Button size="sm" disabled={busy} onClick={() => accept.mutate()}>
              {accept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden />}
              {item.kind === "SOCIAL_POST" && createsPosts
                ? "Criar postagem"
                : item.kind === "AD_CAMPAIGN" && createsAds
                  ? "Criar rascunho do anúncio"
                  : "Virar tarefa"}
            </Button>
            <Button size="sm" variant="ghost" disabled={busy} onClick={() => discard.mutate()}>
              <X className="h-4 w-4" aria-hidden />
              Descartar
            </Button>
          </>
        )}
        {item.socialPostId && (
          <Button asChild size="sm" variant="outline">
            <Link to={`${baseUrl}/posts/${item.socialPostId}`}>
              <ExternalLink className="h-4 w-4" aria-hidden />
              Abrir postagem
            </Link>
          </Button>
        )}
        {item.adDraftId && (
          <Button asChild size="sm" variant="outline">
            <Link to={`${baseUrl}/ads?draft=${item.adDraftId}`}>
              <Megaphone className="h-4 w-4" aria-hidden />
              Abrir rascunho do anúncio
            </Link>
          </Button>
        )}
        {item.status === "ACCEPTED" && canBuildInModule && moduleTarget && (
          <Button size="sm" variant="outline" onClick={() => void openModule()}>
            <ExternalLink className="h-4 w-4" aria-hidden />
            {moduleTarget.label}
          </Button>
        )}
      </div>
    </li>
  );
};

/** Plano do mês: o usuário conta o objetivo e a IA distribui postagens, campanhas, anúncios e tarefas pelos dias. */
export const PlannerPlanPanel: FC = () => {
  const { client, can, access } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const canManage = can("planner.manage");
  const createsPosts = can("posts.manage") && access.organicEnabled;
  const createsAds = can("ads.manage") && access.adsEnabled;
  const adAccountId = useReadLocalStorage<string | null>(`ads:account:${client.id}`);

  const monthOptions = [0, 1, 2, 3].map((offset) => format(addMonths(new Date(), offset), "yyyy-MM"));
  const [month, setMonth] = useState(monthOptions[0]);
  const [goal, setGoal] = useState("");
  const availableChannels = channelOptions.filter(
    (option) => (!option.requiresAds || access.adsEnabled) && (!option.requiresOrganic || access.organicEnabled),
  );
  const [channels, setChannels] = useState<PlannerItemKind[]>(availableChannels.map((option) => option.value));
  const [postsPerWeek, setPostsPerWeek] = useState(3);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [acceptingAll, setAcceptingAll] = useState(false);

  const plansQuery = useQuery({
    queryKey: ["planner", client.id, "plans"],
    queryFn: () => plannerService.findPlans(client.id),
    refetchInterval: (query) => (query.state.data?.some((plan) => plan.status === "GENERATING") ? 4000 : false),
  });
  const plans = plansQuery.data ?? [];
  const plan = plans.find((item) => item.id === selectedPlanId) ?? plans[0];

  // Quando um plano termina de gerar, o calendário ganha as sugestões
  const generating = plans.some((item) => item.status === "GENERATING");
  useEffect(() => {
    if (!generating) queryClient.invalidateQueries({ queryKey: ["planner", client.id, "calendar"] });
  }, [generating, client.id, queryClient]);

  const create = useMutation({
    mutationFn: () => plannerService.createPlan(client.id, { month, goal: goal.trim(), channels, postsPerWeek }),
    onError: requestErrorHandling,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["planner", client.id, "plans"] });
      setSelectedPlanId(created.id);
      setGoal("");
      toast.success("A IA está montando o plano do mês");
    },
  });
  const regenerate = useMutation({
    mutationFn: (id: string) => plannerService.regeneratePlan(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planner", client.id, "plans"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => plannerService.deletePlan(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      setSelectedPlanId(null);
      queryClient.invalidateQueries({ queryKey: ["planner", client.id] });
      toast.success("Plano excluído");
    },
  });

  // Aceita em sequência e para no primeiro erro. Com postagens, confere antes o limite de imagens/vídeos de hoje
  // e para antes da primeira que passaria dele, explicando
  const acceptAll = async () => {
    if (!plan) return;
    let pending = plan.items.filter((item) => item.status === "SUGGESTED");
    let quotaNote = "";
    if (createsPosts && pending.some((item) => item.kind === "SOCIAL_POST")) {
      const usage = await creativeStudioService.findDailyUsage(client.id).catch(() => null);
      if (usage) {
        let imagesLeft = usage.posts.images.max - usage.posts.images.used;
        let videosLeft = usage.posts.videos.max - usage.posts.videos.used;
        const stopAt = pending.findIndex((item) => {
          if (item.kind !== "SOCIAL_POST") return false;
          const postFormat = item.format ?? "IMAGE";
          if (postFormat === "REEL") return videosLeft-- < 1;
          imagesLeft -= usage.posts.defaultImagesByFormat[postFormat];
          return imagesLeft < 0;
        });
        if (stopAt === 0) {
          toast.warning(
            "O limite de imagens e vídeos com IA de hoje não deixa criar a próxima postagem. Tente amanhã ou aceite outras sugestões uma por uma.",
          );
          return;
        }
        if (stopAt > 0) {
          const blocked = pending[stopAt];
          quotaNote = ` Paramos antes da postagem de ${format(new Date(blocked.date), "dd/MM")} ("${blocked.title}"): ela passaria do limite de imagens e vídeos com IA de hoje. As ${pending.length - stopAt} restantes ficam para aceitar amanhã.`;
          pending = pending.slice(0, stopAt);
        }
      }
    }
    const posts = pending.filter((item) => item.kind === "SOCIAL_POST").length;
    const ads = createsAds ? pending.filter((item) => item.kind === "AD_CAMPAIGN").length : 0;
    if (
      !(await confirm({
        title: `Aceitar ${pending.length} sugestões?`,
        description:
          (createsPosts && posts
            ? `${posts} viram postagens em rascunho (a IA escreve e gera as imagens de cada uma, usando a cota) e o resto vira tarefa.`
            : "Cada sugestão vira uma tarefa no dia, com o briefing.") +
          (ads ? ` ${ads} anúncio(s) também viram rascunho de campanha em Anúncios, sem publicar.` : "") +
          quotaNote,
        confirmLabel: "Aceitar",
      }))
    )
      return;
    setAcceptingAll(true);
    let accepted = 0;
    try {
      for (const item of pending) {
        await plannerService.acceptItem(client.id, item.id, { adAccountId: adAccountId ?? undefined });
        accepted++;
      }
      toast.success(`${accepted} sugestões aceitas`);
    } catch (error) {
      requestErrorHandling(error);
      if (accepted) toast.info(`${accepted} de ${pending.length} sugestões aceitas antes do erro`);
    } finally {
      setAcceptingAll(false);
      queryClient.invalidateQueries({ queryKey: ["planner", client.id] });
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id] });
      queryClient.invalidateQueries({ queryKey: ["creativeStudio", client.id, "usage"] });
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (goal.trim() && channels.length) create.mutate();
  };

  const pendingCount = plan?.items.filter((item) => item.status === "SUGGESTED").length ?? 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {canManage && (
        <form onSubmit={onSubmit} className="grid content-start gap-3 rounded-xl border p-4">
          <div>
            <h2 className="font-medium">Planejar o mês com IA</h2>
            <p className="text-muted-foreground text-xs">
              A IA usa a identidade da sua marca, as boas práticas e o que já está marcado, e sugere o que fazer em cada dia. Nada é
              publicado ou enviado sem você.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plan-month">Mês</Label>
            <select
              id="plan-month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className={cn(plannerSelectClassName, "capitalize")}
            >
              {monthOptions.map((option) => (
                <option key={option} value={option}>
                  {monthLabel(option)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="plan-goal">Objetivo do mês</Label>
            <textarea
              id="plan-goal"
              value={goal}
              maxLength={3000}
              placeholder={goalExamples[0]}
              onChange={(event) => setGoal(event.target.value)}
              className={plannerTextareaClassName}
            />
            <div className="flex flex-wrap gap-1">
              {goalExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setGoal(example)}
                  className="text-muted-foreground hover:bg-accent rounded-full border px-2 py-0.5 text-left text-xs"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Canais</legend>
            {availableChannels.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <Checkbox
                  id={`plan-channel-${option.value}`}
                  checked={channels.includes(option.value)}
                  onCheckedChange={(checked) =>
                    setChannels((current) =>
                      checked === true ? [...new Set([...current, option.value])] : current.filter((item) => item !== option.value),
                    )
                  }
                />
                <Label htmlFor={`plan-channel-${option.value}`} className="font-normal">
                  {option.label}
                </Label>
              </div>
            ))}
          </fieldset>
          {channels.includes("SOCIAL_POST") && (
            <div className="grid gap-1.5">
              <Label htmlFor="plan-posts-per-week">Postagens por semana</Label>
              <Input
                id="plan-posts-per-week"
                type="number"
                min={1}
                max={14}
                value={postsPerWeek}
                onChange={(event) => setPostsPerWeek(Math.min(14, Math.max(1, Number(event.target.value) || 1)))}
                className="w-24"
              />
            </div>
          )}
          <Button type="submit" disabled={!goal.trim() || !channels.length || create.isPending}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" aria-hidden />}
            Montar plano
          </Button>
        </form>
      )}

      <div className="grid min-w-0 content-start gap-4">
        {plansQuery.isLoading && <LoadingState label="Carregando planos..." />}
        {plansQuery.isSuccess && plans.length === 0 && (
          <EmptyState
            icon={Sparkles}
            title="Nenhum plano ainda"
            description={
              canManage ? "Conte o objetivo do mês e a IA sugere o calendário." : "Quem planeja o marketing monta o plano do mês aqui."
            }
          />
        )}

        {plans.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {plans.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={item.id === plan?.id ? "secondary" : "ghost"}
                aria-pressed={item.id === plan?.id}
                onClick={() => setSelectedPlanId(item.id)}
                className="capitalize"
              >
                {monthLabel(item.month)}
                <span className="text-muted-foreground text-xs normal-case">· {format(new Date(item.createdAt), "dd/MM")}</span>
              </Button>
            ))}
          </div>
        )}

        {plan && (
          <section className="grid gap-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-lg font-medium capitalize">Plano de {monthLabel(plan.month)}</h2>
                <p className="text-muted-foreground text-sm">{plan.goal}</p>
              </div>
              {canManage && (
                <div className="flex flex-wrap gap-2">
                  {plan.status === "READY" && pendingCount > 0 && (
                    <Button size="sm" disabled={acceptingAll} onClick={acceptAll}>
                      {acceptingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" aria-hidden />}
                      Aceitar todas ({pendingCount})
                    </Button>
                  )}
                  {plan.status !== "GENERATING" && (
                    <Button size="sm" variant="outline" disabled={regenerate.isPending} onClick={() => regenerate.mutate(plan.id)}>
                      <RotateCw className="h-4 w-4" aria-hidden />
                      Refazer sugestões
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    disabled={remove.isPending}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: "Excluir o plano?",
                          description: "As sugestões abertas somem do calendário. Postagens e tarefas já criadas continuam.",
                          destructive: true,
                          confirmLabel: "Excluir",
                        })
                      )
                        remove.mutate(plan.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Excluir
                  </Button>
                </div>
              )}
            </div>

            {plan.status === "GENERATING" && <LoadingState label="A IA está montando o plano do mês..." />}
            {plan.status === "FAILED" && (
              <p className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{plan.error}</p>
            )}
            {plan.status === "READY" && plan.summary && <p className="bg-muted/50 rounded-lg p-3 text-sm">{plan.summary}</p>}
            {plan.status === "READY" && (
              <ul className="grid gap-2">
                {plan.items.map((item) => (
                  <PlanItemRow key={item.id} item={item} canManage={canManage} createsPosts={createsPosts} createsAds={createsAds} />
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
      {confirmDialog}
    </div>
  );
};
