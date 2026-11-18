import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { AlertTriangle, ExternalLink, ShieldCheck, X } from "lucide-react";
import { type FC } from "react";
import { Link } from "react-router";
import { linkKindLabel, linkSourceLabel, linkTarget } from "./strategyUtils";

const VALIDATABLE: MarketingLinkKind[] = ["AD_DRAFT", "AD_VIDEO_CAMPAIGN"];

type Props = {
  links: MarketingStrategyLink[];
  canManage: boolean;
  onValidate: (link: MarketingStrategyLink) => void;
  onUnlink: (linkId: string) => void;
};

/** O que nasceu do passo (ou da estratégia), com o validador nos anúncios e o botão de desligar. */
export const StrategyLinkList: FC<Props> = ({ links, canManage, onValidate, onUnlink }) => {
  const baseUrl = useBaseUrl();

  return (
    <ul className="flex flex-wrap gap-2 text-xs">
      {links.map((link) => (
        <li key={link.id} className="bg-muted inline-flex items-center gap-1 rounded py-0.5 pr-0.5 pl-2">
          <Link
            to={linkTarget(baseUrl, link)}
            className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            title={`${linkKindLabel[link.kind]} ligada ${linkSourceLabel[link.source]} em ${format(new Date(link.createdAt), "dd/MM/yyyy")}`}
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            {link.name ? <span className="max-w-48 truncate">{link.name}</span> : linkKindLabel[link.kind]} ·{" "}
            {format(new Date(link.createdAt), "dd/MM")}
          </Link>
          {link.lostMarker && (
            <span
              className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400"
              title="A campanha foi renomeada sem a marca da estratégia. Ela continua ligada aqui, mas relatórios fora do sistema não vão reconhecê-la."
            >
              <AlertTriangle className="h-3 w-3" aria-hidden />
              Perdeu a marca
            </span>
          )}
          {VALIDATABLE.includes(link.kind) && (
            <button
              type="button"
              className={cn(
                "hover:bg-background inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium",
                link.validation &&
                  (link.validation.score >= 70 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"),
              )}
              onClick={() => onValidate(link)}
              title="Avaliar o anúncio contra o playbook antes de publicar"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden />
              {link.validation ? `${link.validation.score}/100` : "Validar"}
            </button>
          )}
          {canManage && (
            <button
              type="button"
              className="hover:bg-background text-muted-foreground rounded p-1"
              aria-label={`Desligar ${linkKindLabel[link.kind]} da estratégia`}
              title="Desligar da estratégia (o item continua existindo)"
              onClick={() => onUnlink(link.id)}
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
};
