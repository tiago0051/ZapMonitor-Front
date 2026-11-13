import { useClientContext } from "@/context/ClientContext/clientContext";
import { useState } from "react";

export type GuideStep = {
  id: string;
  title: string;
  description: string;
  // Por que o passo importa, mostrado no passo atual
  why: string;
  action: string;
  url: string;
  permission: Permission;
  requiresCrm?: boolean;
  isDone: (onboarding: HomeOnboarding) => boolean;
};

// Na ordem em que o produto passa a funcionar: canal → quem atende → como atende → o que vem depois
const guideSteps: GuideStep[] = [
  {
    id: "number",
    title: "Conecte seu WhatsApp",
    description: "Ligue o número da empresa pela API oficial da Meta ou por QR code.",
    why: "É por ele que as conversas chegam. Sem um número conectado, nada aparece no atendimento.",
    action: "Conectar número",
    url: "configuration?tab=numbers",
    permission: "channels.manage",
    isDone: (onboarding) => onboarding.hasNumber,
  },
  {
    id: "team",
    title: "Convide sua equipe",
    description: "Chame quem vai atender e escolha o papel de cada pessoa.",
    why: "Cada pessoa entra com o próprio login, e o papel define o que ela pode ver e fazer.",
    action: "Convidar pessoas",
    url: "members",
    permission: "members.manage",
    isDone: (onboarding) => onboarding.hasTeam,
  },
  {
    id: "serviceGroup",
    title: "Crie um grupo de atendimento",
    description: "Junte quem atende e escolha quais números o grupo recebe.",
    why: "O grupo forma a fila: quando o contato pede um humano, a conversa vai para as pessoas certas.",
    action: "Criar grupo",
    url: "configuration?tab=serviceGroup",
    permission: "serviceGroups.manage",
    isDone: (onboarding) => onboarding.hasServiceGroup,
  },
  {
    id: "flow",
    title: "Monte e ative o fluxo de atendimento",
    description: "Defina a mensagem de boas-vindas, as perguntas e quando chamar um atendente ou a IA.",
    why: "O fluxo responde na hora, 24 horas por dia, e só passa para a equipe o que precisa de uma pessoa.",
    action: "Abrir fluxos",
    url: "configuration?tab=flow",
    permission: "flows.manage",
    isDone: (onboarding) => onboarding.hasActiveFlow,
  },
  {
    id: "contacts",
    title: "Traga seus contatos",
    description: "Cadastre ou importe a sua base de clientes.",
    why: "Com os contatos no sistema você vê o histórico de cada pessoa e pode mandar campanhas para eles.",
    action: "Ir para contatos",
    url: "contacts",
    permission: "contacts.manage",
    isDone: (onboarding) => onboarding.hasContacts,
  },
  {
    id: "template",
    title: "Crie um modelo de mensagem",
    description: "Escreva um template para a Meta aprovar. A IA ajuda a montar e revisar.",
    why: "Fora da janela de 24 horas, o WhatsApp só deixa a empresa puxar conversa com um modelo aprovado.",
    action: "Criar modelo",
    url: "configuration?tab=template",
    permission: "templates.manage",
    isDone: (onboarding) => onboarding.hasTemplate,
  },
  {
    id: "pipeline",
    title: "Configure seu funil de vendas",
    description: "Crie as etapas por onde cada negócio passa até a venda.",
    why: "Assim você acompanha cada oportunidade no CRM e vê onde os clientes param.",
    action: "Criar funil",
    url: "configuration?tab=pipeline",
    permission: "crm.manage",
    requiresCrm: true,
    isDone: (onboarding) => onboarding.hasPipeline,
  },
  {
    id: "notifications",
    title: "Ative as notificações",
    description: "Receba um aviso no computador ou no celular quando chegar conversa nova.",
    why: "Você fica sabendo da fila mesmo com o sistema em outra aba ou fechado.",
    action: "Abrir atendimento",
    url: "whatsapp",
    permission: "whatsapp.chat",
    isDone: (onboarding) => onboarding.hasPushNotifications,
  },
  {
    id: "firstService",
    title: "Faça seu primeiro atendimento",
    description: "Assuma uma conversa da fila e responda o contato.",
    why: "É o dia a dia do atendimento: pegar da fila, conversar e finalizar quando resolver.",
    action: "Ir para a fila",
    url: "whatsapp",
    permission: "whatsapp.chat",
    isDone: (onboarding) => onboarding.hasAttendedService,
  },
];

const hiddenKey = (clientId: string, userId: string) => `zapmonitor:homeGuideHidden:${clientId}:${userId}`;

const readHidden = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const writeHidden = (key: string, hidden: boolean) => {
  try {
    if (hidden) localStorage.setItem(key, "1");
    else localStorage.removeItem(key);
  } catch {
    // Sem armazenamento, o guia volta na próxima visita
  }
};

/** Passos que fazem sentido para quem está logado, com o que já foi feito. */
export const useGuideSteps = (onboarding?: HomeOnboarding) => {
  const { can, access } = useClientContext();

  if (!onboarding) return [];

  return guideSteps
    .filter((step) => can(step.permission) && (!step.requiresCrm || access.crmEnabled))
    .map((step) => ({ ...step, done: step.isDone(onboarding) }));
};

export const useGuideVisibility = (clientId: string, userId: string) => {
  const key = hiddenKey(clientId, userId);
  const [isHidden, setIsHidden] = useState(() => readHidden(key));

  const setHidden = (hidden: boolean) => {
    setIsHidden(hidden);
    writeHidden(key, hidden);
  };

  return { isHidden, setHidden };
};
