import { useBaseUrl } from "@/hooks/use-baseUrl";
import { ExternalLink, FileText, Mail, Megaphone, Send } from "lucide-react";
import { Link } from "react-router";
import type { FC } from "react";
import { dealOriginLabel } from "../crmUtils";

const originIcon: Record<DealOriginType, typeof Megaphone> = {
  AD_MESSAGE: Megaphone,
  LEAD_FORM: FileText,
  BROADCAST: Send,
  EMAIL_CAMPAIGN: Mail,
};

/** Selo do card: de qual anúncio ou campanha veio o negócio. */
export const DealOriginBadge: FC<{ origin: DealOrigin }> = ({ origin }) => {
  const Icon = originIcon[origin.type];
  const campaign = origin.detail?.campaignName;

  return (
    <p className="flex items-center gap-1 text-[11px] text-violet-700 dark:text-violet-300" title={origin.detail?.adName ?? undefined}>
      <Icon className="h-3 w-3 shrink-0" />
      <span className="truncate">
        {dealOriginLabel[origin.type]}
        {campaign && ` · ${campaign}`}
      </span>
    </p>
  );
};

/** Bloco do detalhe do negócio com campanha, conjunto, anúncio e o que o contato viu. */
export const DealOriginDetails: FC<{ origin: DealOrigin }> = ({ origin }) => {
  const baseUrl = useBaseUrl();
  const detail = origin.detail;
  // Disparo ou e-mail: o link leva aos resultados da campanha
  const campaignPath = origin.broadcastId
    ? `${baseUrl}/broadcasts/${origin.broadcastId}`
    : origin.emailCampaignId
      ? `${baseUrl}/broadcasts/email/${origin.emailCampaignId}`
      : null;
  const rows = [
    ["Campanha", detail?.campaignName],
    ["Conjunto", detail?.adSetName],
    ["Anúncio", detail?.adName ?? (origin.metaAdId ? `Id ${origin.metaAdId}` : null)],
    ["Página", detail?.pageName],
  ].filter((row): row is [string, string] => !!row[1]);

  return (
    <section className="space-y-2">
      <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Origem</p>
      <div className="flex gap-3 rounded-lg border border-violet-200 bg-violet-50/50 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/20">
        {detail?.thumbnailUrl && (
          <img src={detail.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" loading="lazy" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="font-medium">{dealOriginLabel[origin.type]}</p>
          {detail?.headline && <p className="text-muted-foreground line-clamp-2 text-xs">“{detail.headline}”</p>}
          <dl className="grid grid-cols-[auto_1fr] gap-x-2 text-xs">
            {rows.map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="truncate" title={value}>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {campaignPath && (
            <Link to={campaignPath} className="text-primary inline-flex items-center gap-1 text-xs hover:underline">
              Ver a campanha
            </Link>
          )}
          {detail?.sourceUrl && (
            <a
              href={detail.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
            >
              Ver anúncio <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
};
