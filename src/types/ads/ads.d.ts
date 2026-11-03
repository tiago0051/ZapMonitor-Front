type AdSyncStatus = "PENDING" | "SYNCING" | "SUCCESS" | "FAILED";

type AdAccount = {
  id: string;
  metaAccountId: string;
  name: string;
  currency: string;
  timezoneName: string | null;
  // account_status da Meta: 1 ativa, 2 desativada, 3 sem pagamento...
  accountStatus: number;
  businessName: string | null;
  syncStatus: AdSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
};

type MetaAdsConnection = {
  connected: boolean;
  metaUserName: string | null;
  scopes: string[];
  // Permissões que destravam as próximas fases e ainda não foram concedidas
  missingScopes: string[];
  tokenExpiresAt: string | null;
  accounts: AdAccount[];
};

type AvailableAdAccount = {
  metaAccountId: string;
  name: string;
  currency: string;
  accountStatus: number;
  businessName: string | null;
  linked: boolean;
};

type AdCreativeSnapshot = {
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  thumbnailUrl: string | null;
  callToActionType: string | null;
  objectType: string | null;
};

type MetaAd = {
  metaId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  creative: AdCreativeSnapshot | null;
};

type MetaAdSet = {
  metaId: string;
  name: string;
  status: string;
  effectiveStatus: string;
  // Centavos da moeda da conta
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  optimizationGoal: string | null;
  billingEvent: string | null;
  destinationType: string | null;
  targeting: Record<string, unknown> | null;
  ads: MetaAd[];
};

type MetaCampaign = {
  metaId: string;
  name: string;
  objective: string | null;
  status: string;
  effectiveStatus: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  bidStrategy: string | null;
  adSets: MetaAdSet[];
};

type MetaAudience = {
  metaId: string;
  name: string;
  subtype: string | null;
  approximateCount: number | null;
  deliveryStatus: string | null;
};

type AdAccountStructure = {
  account: AdAccount;
  campaigns: MetaCampaign[];
  audiences: MetaAudience[];
};
