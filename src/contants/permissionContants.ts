export const tenantRoleLabel: Record<TenantRole, string> = {
  IMPLANTER: "Implantador",
  ADMIN: "Administrador",
  ATTENDANT: "Atendente",
  CUSTOM: "Personalizado",
};

export const tenantRoleDescription: Record<TenantRole, string> = {
  IMPLANTER: "Acessa tudo, inclusive números de WhatsApp, IA e API.",
  ADMIN: "Administra o cliente: equipe, fluxos, grupos, templates e relatórios.",
  ATTENDANT: "Atende as conversas do WhatsApp.",
  CUSTOM: "Recebe as permissões de um grupo de permissão.",
};
