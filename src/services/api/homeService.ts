import api from "./api";

export const homeService = {
  findOverview: async ({ params, queries }: FindHomeOverviewRequestData): Promise<HomeOverview> => {
    const response = await api.get<HomeOverview>(`/client/${params.clientId}/home/overview`, { params: queries });
    return response.data;
  },
  findMenuBadges: async ({ params, queries }: FindHomeOverviewRequestData): Promise<MenuBadges> => {
    const response = await api.get<MenuBadges>(`/client/${params.clientId}/home/badges`, { params: queries });
    return response.data;
  },
};
