import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { ArrowRight, CheckCircle2, Circle, Megaphone } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";

type MarketingStep = {
  id: keyof HomeMarketing;
  title: string;
  why: string;
  action: string;
  url: string;
  permission: Permission;
};

// Na ordem em que a IA de marketing passa a acertar: quem é a marca → onde anunciar → o que é venda → o plano
const marketingSteps: MarketingStep[] = [
  {
    id: "hasBrandIdentity",
    title: "Identidade da marca",
    why: "A IA usa o que você vende, o tom e as cores em anúncios, postagens e no plano do mês.",
    action: "Preencher a marca",
    url: "configuration?tab=brandIdentity",
    permission: "brand.manage",
  },
  {
    id: "hasAdAccount",
    title: "Conectar as contas de anúncio",
    why: "Com a conta ligada, o sistema mostra os resultados e cria e ajusta as campanhas por você.",
    action: "Conectar contas",
    url: "configuration?tab=metaAds",
    permission: "ads.manage",
  },
  {
    id: "hasSaleEvent",
    title: "Avisar as vendas para a plataforma",
    why: "Quando o negócio vira venda no CRM, a plataforma de anúncio aprende quem compra e acha mais gente parecida.",
    action: "Configurar eventos",
    url: "ads?tab=conversions",
    permission: "ads.manage",
  },
  {
    id: "hasStrategy",
    title: "Primeira estratégia",
    why: "Conte o produto e o objetivo: a IA monta o passo a passo e mede o que deu certo.",
    action: "Criar estratégia",
    url: "strategies",
    permission: "strategies.manage",
  },
];

/** Marketing em 4 passos, com o status real de cada um; some quando tudo está feito. */
export const MarketingSteps: FC<{ marketing: HomeMarketing | null | undefined }> = ({ marketing }) => {
  const { can } = useClientContext();
  const baseUrl = useBaseUrl();
  if (!marketing) return null;

  const doneCount = marketingSteps.filter((step) => marketing[step.id]).length;
  if (doneCount === marketingSteps.length) return null;
  const current = marketingSteps.find((step) => !marketing[step.id]);

  return (
    <section aria-labelledby="marketing-steps" className="bg-card rounded-xl border p-4 shadow-xs md:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Megaphone className="text-primary h-5 w-5" aria-hidden />
        <h2 id="marketing-steps" className="text-lg font-semibold">
          Marketing em 4 passos
        </h2>
        <span className="text-muted-foreground text-sm tabular-nums">
          {doneCount} de {marketingSteps.length} feitos
        </span>
      </div>
      <ol className="grid gap-2 md:grid-cols-4">
        {marketingSteps.map((step, index) => {
          const done = marketing[step.id];
          const isCurrent = step.id === current?.id;
          return (
            <li
              key={step.id}
              className={cn("grid content-start gap-2 rounded-lg border p-3", isCurrent && "border-primary/40 bg-primary/5")}
            >
              <div className="flex items-center gap-2">
                {done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Feito" />
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5 shrink-0" aria-label="A fazer" />
                )}
                <p className={cn("text-sm font-medium", done && "text-muted-foreground")}>
                  {index + 1}. {step.title}
                </p>
              </div>
              {!done && <p className="text-muted-foreground text-xs">{step.why}</p>}
              {!done && can(step.permission) && (
                <Button asChild size="sm" variant={isCurrent ? "default" : "outline"} className="justify-self-start">
                  <Link to={`${baseUrl}/${step.url}`}>
                    {step.action}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </Button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
