export type ChecklistItem = { label: string; ok: boolean; details: string[] };

type ChecklistInput = {
  routing: AdDraftRouting;
  plan: AdCampaignPlan | null;
  assets: AdCreativeAsset[];
};

/**
 * O que falta para criar na Meta, calculado na tela com o que está sendo editado (antes de salvar).
 * Segue as mesmas regras que o servidor confere ao publicar (publishErrors); públicos que sumiram da conta só o
 * servidor sabe, por isso a lista dele continua aparecendo.
 */
export const buildPublishChecklist = ({ routing, plan, assets }: ChecklistInput): ChecklistItem[] => {
  const items: ChecklistItem[] = [
    { label: "Número de WhatsApp que recebe as conversas", ok: !!routing.whatsappConfigurationId, details: [] },
    { label: "Página do Facebook ligada ao número", ok: !!routing.metaPageId, details: [] },
    { label: "Plano da campanha montado", ok: !!plan, details: [] },
  ];
  if (!plan) return items;

  const campaignDetails: string[] = [];
  if (!plan.campaignName.trim()) campaignDetails.push("Dê um nome à campanha");
  if (!(plan.dailyBudget >= 1)) campaignDetails.push("Verba diária de pelo menos 1");
  items.push({ label: "Nome e verba diária da campanha", ok: campaignDetails.length === 0, details: campaignDetails });

  const adSetDetails: string[] = [];
  if (plan.adSets.length === 0) adSetDetails.push("Crie pelo menos um conjunto");
  if (plan.abTest.enabled && plan.adSets.length !== 2) adSetDetails.push("O teste A/B compara exatamente dois conjuntos");
  for (const adSet of plan.adSets) {
    const label = adSet.name.trim() || adSet.key;
    if (!adSet.name.trim()) adSetDetails.push(`Conjunto "${label}": dê um nome`);
    if (adSet.countries.length === 0) adSetDetails.push(`Conjunto "${label}": escolha pelo menos um país`);
    if (adSet.ageMin < 18 || adSet.ageMax > 65 || adSet.ageMin > adSet.ageMax)
      adSetDetails.push(`Conjunto "${label}": idade entre 18 e 65`);
    if (!plan.creatives.some((creative) => creative.adSetKey === adSet.key))
      adSetDetails.push(`Conjunto "${label}": crie pelo menos um anúncio`);
  }
  items.push({ label: "Conjuntos com país, idade e pelo menos um anúncio", ok: adSetDetails.length === 0, details: adSetDetails });

  const textDetails: string[] = [];
  const creativeDetails: string[] = [];
  const assetIds = new Set(assets.map((asset) => asset.id));
  for (const creative of plan.creatives) {
    const label = `Anúncio "${creative.name.trim() || creative.key}"`;
    if (!creative.primaryText.trim() || !creative.headline.trim()) textDetails.push(`${label}: preencha o texto e o título`);
    if (!creative.welcomeMessage.trim()) textDetails.push(`${label}: preencha a mensagem de boas-vindas`);
    if (!creative.assetId || !assetIds.has(creative.assetId)) creativeDetails.push(`${label}: escolha uma imagem ou vídeo`);
  }
  items.push({ label: "Textos, títulos e mensagem de boas-vindas dos anúncios", ok: textDetails.length === 0, details: textDetails });
  items.push({ label: "Imagem ou vídeo em cada anúncio", ok: creativeDetails.length === 0, details: creativeDetails });

  return items;
};
