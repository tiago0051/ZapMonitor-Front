import api from "./api";

const base = (clientId: string) => `/client/${clientId}/planner`;

export type PlannerTaskBody = {
  title: string;
  description?: string | null;
  dueAt: string;
  allDay?: boolean;
  category?: PlannerTaskCategory;
  assigneeUserId?: string | null;
};

export const plannerService = {
  findCalendar: async (clientId: string, from: string, to: string): Promise<PlannerEvent[]> =>
    (await api.get(`${base(clientId)}/calendar`, { params: { from, to } })).data,

  move: async (clientId: string, body: { type: PlannerEventType; id: string; date: string }) =>
    (await api.post(`${base(clientId)}/calendar/move`, body)).data,

  findTask: async (clientId: string, id: string): Promise<PlannerTask> => (await api.get(`${base(clientId)}/task/${id}`)).data,

  createTask: async (clientId: string, body: PlannerTaskBody): Promise<PlannerTask> =>
    (await api.post(`${base(clientId)}/task`, body)).data,

  updateTask: async (clientId: string, id: string, body: PlannerTaskBody): Promise<PlannerTask> =>
    (await api.put(`${base(clientId)}/task/${id}`, body)).data,

  setTaskCompleted: async (clientId: string, id: string, completed: boolean): Promise<PlannerTask> =>
    (await api.put(`${base(clientId)}/task/${id}/completed`, { completed })).data,

  deleteTask: async (clientId: string, id: string) => (await api.delete(`${base(clientId)}/task/${id}`)).data,

  findPlans: async (clientId: string): Promise<PlannerPlan[]> => (await api.get(`${base(clientId)}/plan`)).data,

  findPlan: async (clientId: string, id: string): Promise<PlannerPlan> => (await api.get(`${base(clientId)}/plan/${id}`)).data,

  createPlan: async (
    clientId: string,
    body: { month: string; goal: string; channels: PlannerItemKind[]; postsPerWeek?: number },
  ): Promise<PlannerPlan> => (await api.post(`${base(clientId)}/plan`, body)).data,

  regeneratePlan: async (clientId: string, id: string): Promise<PlannerPlan> =>
    (await api.post(`${base(clientId)}/plan/${id}/regenerate`)).data,

  deletePlan: async (clientId: string, id: string) => (await api.delete(`${base(clientId)}/plan/${id}`)).data,

  updateItem: async (
    clientId: string,
    id: string,
    body: { date?: string; title?: string; description?: string; format?: SocialPostFormat },
  ): Promise<PlannerPlanItem> => (await api.put(`${base(clientId)}/plan-item/${id}`, body)).data,

  acceptItem: async (clientId: string, id: string, body: { platforms?: SocialPlatform[] } = {}): Promise<PlannerPlanItem> =>
    (await api.post(`${base(clientId)}/plan-item/${id}/accept`, body)).data,

  discardItem: async (clientId: string, id: string): Promise<PlannerPlanItem> =>
    (await api.post(`${base(clientId)}/plan-item/${id}/discard`)).data,
};
