type QuickReply = {
  id: string;
  // Sem a barra
  shortcut: string;
  title: string;
  // Aceita {nome}, {primeiro_nome} e {atendente}
  content: string;
  // Da empresa (toda a equipe vê); falso quando é pessoal
  shared: boolean;
  canEdit: boolean;
  updatedAt: string;
};

type SaveQuickReplyBody = Pick<QuickReply, "shortcut" | "title" | "content" | "shared">;
