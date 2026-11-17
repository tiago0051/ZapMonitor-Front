/** Lê a lista de usos que o back devolve no 409 da exclusão. */
export const usageFromConflict = (error: unknown): ResourceUsage | null => {
  const data = (error as { response?: { status?: number; data?: { usages?: FlowResourceUsage[] } } })?.response;
  if (data?.status !== 409 || !Array.isArray(data.data?.usages)) return null;
  return { canDelete: false, flows: data.data.usages };
};
