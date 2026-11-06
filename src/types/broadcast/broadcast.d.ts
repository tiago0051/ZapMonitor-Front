type BroadcastStatus = "DRAFT" | "SCHEDULED" | "SENDING" | "PAUSED" | "COMPLETED" | "CANCELED";

type BroadcastRecipientStatus = "PENDING" | "SENDING" | "SENT" | "DELIVERED" | "READ" | "REPLIED" | "FAILED" | "SKIPPED" | "CANCELED";

type BroadcastTotals = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  read: number;
  replied: number;
  failed: number;
  skipped: number;
  canceled: number;
};

type Broadcast = {
  id: string;
  name: string;
  status: BroadcastStatus;
  source: "SCREEN" | "API";
  configurationId: string;
  configurationPhoneNumber: string | null;
  templateId: string | null;
  templateName: string;
  templateLanguage: string;
  templateCategory: string | null;
  headerFileId: string | null;
  pausedReason: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdByName: string | null;
  createdAt: string;
  totals: BroadcastTotals;
};

type BroadcastRecipient = {
  id: string;
  phoneNumber: string;
  name: string | null;
  contactId: string | null;
  status: BroadcastRecipientStatus;
  skipReason: "OPTED_OUT" | "INVALID_PHONE" | null;
  errorCode: number | null;
  errorMessage: string | null;
  variables: Record<string, string> | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  repliedAt: string | null;
  failedAt: string | null;
};

type BroadcastAudienceContact = {
  contactId: string;
  phoneNumber: string;
  name: string | null;
  surname: string | null;
  dealTitle: string | null;
  fields: Record<string, string>;
};

type BroadcastOptOut = {
  id: string;
  phoneNumber: string;
  source: "KEYWORD" | "BUTTON" | "MANUAL";
  createdAt: string;
};

type BroadcastRecipientInput = {
  phoneNumber: string;
  name?: string;
  variables?: Record<string, string>;
};

type BroadcastPage<T> = { total: number; page: number; take: number; items: T[] };
