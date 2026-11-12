import api from "./api";

/** Wiki de estratégias: leitura no tenant e edição pelo dono do sistema. */
export const strategyWikiService = {
  findForClient: async ({ params }: { params: { clientId: string } }): Promise<StrategyWiki> => {
    const response = await api.get<StrategyWiki>(`/client/${params.clientId}/strategy-wiki`);
    return response.data;
  },

  findForOwner: async (): Promise<StrategyWiki> => {
    const response = await api.get<StrategyWiki>("/owner/strategy-wiki");
    return response.data;
  },

  create: async ({ body }: { body: StrategyArticleContent & { slug: string } }): Promise<StrategyArticle> => {
    const response = await api.post<StrategyArticle>("/owner/strategy-wiki", body);
    return response.data;
  },

  update: async ({ params, body }: { params: { slug: string }; body: StrategyArticleContent }): Promise<StrategyArticle> => {
    const response = await api.put<StrategyArticle>(`/owner/strategy-wiki/${params.slug}`, body);
    return response.data;
  },

  setEnabled: async ({ params, body }: { params: { slug: string }; body: { enabled: boolean } }): Promise<StrategyArticle> => {
    const response = await api.put<StrategyArticle>(`/owner/strategy-wiki/${params.slug}/enabled`, body);
    return response.data;
  },

  /** Artigo padrão volta ao texto do sistema; artigo criado pelo dono é apagado. */
  resetOrDelete: async ({ params }: { params: { slug: string } }): Promise<void> => {
    await api.delete(`/owner/strategy-wiki/${params.slug}`);
  },
};
