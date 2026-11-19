type User = {
  id: string;
  email: string;
  name: string;
  // Como aparece para os clientes nas mensagens; vazio usa o primeiro nome
  nickname?: string | null;
  // Só vem do /user/me: implantador de algum tenant, pode abrir o painel do implantador
  isImplanter?: boolean;
  // Só vem do /user/me: dono do sistema, pode abrir a tela do dono
  isOwner?: boolean;
};
