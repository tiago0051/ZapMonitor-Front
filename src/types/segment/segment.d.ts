type SegmentDealStatus = "OPEN" | "WON" | "LOST";
type SegmentOrigin = "AD_MESSAGE" | "LEAD_FORM" | "BROADCAST" | "EMAIL_CAMPAIGN" | "NONE";
type SegmentChannel = "WHATSAPP" | "EMAIL";

/** Uma regra do segmento; o servidor confere e resolve. */
type SegmentCondition =
  | { type: "TAG"; categoryIds: string[] }
  | { type: "DEAL"; pipelineId: string | null; stageIds: string[]; statuses: SegmentDealStatus[] }
  | { type: "ORIGIN"; origins: SegmentOrigin[] }
  | { type: "FIELD"; scope: "CONTACT" | "DEAL"; fieldId: string; operator: "EQUALS" | "FILLED"; value: string | null }
  | { type: "CREATED"; withinDays: number | null; from: string | null; to: string | null }
  | { type: "CONSENT"; channel: SegmentChannel };

type SegmentConditionType = SegmentCondition["type"];

/** Quem entra (todas as regras ou qualquer uma) e quem sai (qualquer regra de excluir). */
type SegmentRules = { match: "ALL" | "ANY"; include: SegmentCondition[]; exclude: SegmentCondition[] };

type ContactSegment = {
  id: string;
  name: string;
  rules: SegmentRules;
  createdAt: string;
  updatedAt: string;
};

type SegmentPreview = { total: number; withPhone: number; withEmail: number };

/** Segmento escolhido numa tela: o salvo (id) e as regras, que podem ter sido mexidas depois de abrir. */
type SegmentSelection = { segmentId: string | null; rules: SegmentRules };
