import { format, parseISO } from "date-fns";

export const experimentStatusInfo: Record<AdExperimentStatus, { label: string; className: string }> = {
  RUNNING: { label: "Em andamento", className: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300" },
  WINNER: { label: "Venceu", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  INCONCLUSIVE: { label: "Sem vencedor", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  STOPPED: { label: "Encerrado", className: "bg-muted text-muted-foreground" },
};

export const experimentLevelLabel: Record<AdExperimentLevel, string> = { AD_SET: "Conjuntos", AD: "Anúncios" };

// Mesmas réguas do back
export const MIN_ARMS = 2;
export const MAX_ARMS = 4;
export const MIN_DAYS = 7;
export const MAX_DAYS = 60;
export const DEFAULT_DAYS = 14;

/** "2026-11-09" ou ISO → "09/11/2026" */
export const formatDay = (value: string) => format(parseISO(value), "dd/MM/yyyy");

export const experimentsQueryKey = (clientId: string, accountId: string) => ["metaAds", "experiments", clientId, accountId];
export const diaryQueryKey = (clientId: string, accountId: string) => ["metaAds", "diary", clientId, accountId];

// Fora do teste: o que já foi excluído ou arquivado na Meta
const isGone = (effectiveStatus: string) => effectiveStatus === "DELETED" || effectiveStatus === "ARCHIVED";

export type ExperimentOption = { metaId: string; label: string; group: string; effectiveStatus: string };

/** Conjuntos ou anúncios da conta para escolher, agrupados pela campanha (e conjunto, no caso de anúncios). */
export const experimentOptions = (structure: AdAccountStructure | undefined, level: AdExperimentLevel): ExperimentOption[] =>
  (structure?.campaigns ?? [])
    .filter((campaign) => !isGone(campaign.effectiveStatus))
    .flatMap((campaign) =>
      campaign.adSets
        .filter((adSet) => !isGone(adSet.effectiveStatus))
        .flatMap((adSet) =>
          level === "AD_SET"
            ? [{ metaId: adSet.metaId, label: adSet.name, group: campaign.name, effectiveStatus: adSet.effectiveStatus }]
            : adSet.ads
                .filter((ad) => !isGone(ad.effectiveStatus))
                .map((ad) => ({
                  metaId: ad.metaId,
                  label: ad.name,
                  group: `${campaign.name} › ${adSet.name}`,
                  effectiveStatus: ad.effectiveStatus,
                })),
        ),
    );
