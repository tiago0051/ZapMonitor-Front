/** Como o atendente aparece para os clientes: o apelido, ou o primeiro nome quando não tem apelido. */
export function attendantDisplayName(user: { name: string; nickname?: string | null } | null | undefined): string {
  const nickname = user?.nickname?.trim();
  if (nickname) return nickname;
  return user?.name.trim().split(/\s+/)[0] ?? "";
}
