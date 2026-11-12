import { Button } from "@/components/ui/button";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { AlertTriangle } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import { socialScopeLabel } from "./postsUtils";

/** O que falta para publicar: conexão com a Meta, página da marca, Instagram e permissões. */
export const PostSetupNotice: FC<{ setup: SocialPostSetup }> = ({ setup }) => {
  const baseUrl = useBaseUrl();
  const issues: { text: string; link: string; action: string }[] = [];

  if (!setup.connected)
    issues.push({
      text: "Conecte a Meta para publicar na página do Facebook e no Instagram.",
      link: `${baseUrl}/configuration?tab=metaAds`,
      action: "Conectar a Meta",
    });
  else {
    if (!setup.metaPageId)
      issues.push({
        text: "Escolha a página da empresa e deixe a IA ler o Instagram e o Facebook para aprender o visual da marca.",
        link: `${baseUrl}/configuration?tab=brandIdentity`,
        action: "Montar a identidade da marca",
      });
    else if (!setup.hasIdentity)
      issues.push({
        text: "A identidade da marca ainda não foi lida: as imagens saem sem as cores e o estilo da empresa.",
        link: `${baseUrl}/configuration?tab=brandIdentity`,
        action: "Ler a identidade",
      });
    const missing = [...new Set([...setup.missingScopes.FACEBOOK, ...setup.missingScopes.INSTAGRAM])];
    if (missing.length)
      issues.push({
        text: `A conexão com a Meta não tem permissão para ${missing.map((scope) => socialScopeLabel[scope] ?? scope).join(", ")}. Reconecte e autorize essas permissões.`,
        link: `${baseUrl}/configuration?tab=metaAds`,
        action: "Reconectar",
      });
    if (setup.metaPageId && !setup.instagramAccountId)
      issues.push({
        text: "A página da marca não tem um Instagram profissional ligado: por enquanto, só dá para publicar no Facebook.",
        link: `${baseUrl}/configuration?tab=brandIdentity`,
        action: "Ler de novo",
      });
  }

  if (!issues.length) return null;

  return (
    <div className="grid gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/40">
      {issues.map((issue) => (
        <div key={issue.text} className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            {issue.text}
          </span>
          <Button asChild size="sm" variant="outline">
            <Link to={issue.link}>{issue.action}</Link>
          </Button>
        </div>
      ))}
    </div>
  );
};
