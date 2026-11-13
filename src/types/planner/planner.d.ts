type PlannerEventType =
  "SOCIAL_POST" | "WHATSAPP_BROADCAST" | "EMAIL_CAMPAIGN" | "AD_CAMPAIGN" | "AD_ACTIVATION" | "CRM_TASK" | "PLANNER_TASK" | "PLAN_ITEM";

type PlannerEvent = {
  key: string;
  type: PlannerEventType;
  id: string;
  title: string;
  detail: string | null;
  date: string;
  endDate: string | null;
  allDay: boolean;
  status: string;
  completed: boolean;
  movable: boolean;
  assignee: { id: string; name: string } | null;
  ref: Record<string, string | null>;
};

type PlannerTaskCategory = "CONTENT" | "CAMPAIGN" | "ADS" | "OTHER";

type PlannerTask = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string;
  allDay: boolean;
  category: PlannerTaskCategory;
  assigneeUserId: string | null;
  assignee: { id: string; name: string } | null;
  completedAt: string | null;
  planItemId: string | null;
};

type PlannerItemKind = "SOCIAL_POST" | "WHATSAPP_BROADCAST" | "EMAIL_CAMPAIGN" | "AD_CAMPAIGN" | "TASK";

type PlannerPlanItem = {
  id: string;
  planId: string;
  date: string;
  kind: PlannerItemKind;
  title: string;
  description: string;
  format: SocialPostFormat | null;
  status: "SUGGESTED" | "ACCEPTED" | "DISCARDED";
  socialPostId: string | null;
  plannerTaskId: string | null;
};

type PlannerPlan = {
  id: string;
  month: string;
  goal: string;
  channels: PlannerItemKind[];
  postsPerWeek: number;
  status: "GENERATING" | "READY" | "FAILED";
  summary: string | null;
  error: string | null;
  createdAt: string;
  items: PlannerPlanItem[];
};
