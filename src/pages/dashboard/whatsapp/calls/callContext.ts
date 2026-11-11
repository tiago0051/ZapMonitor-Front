import { createContext, useContext } from "react";

// connecting: preparando o áudio; ringing: chamando o contato; in_progress: em conversa
export type ActiveCallPhase = "connecting" | "ringing" | "in_progress";

export type ActiveCall = {
  // Nulo enquanto a ligação feita ainda não foi aceita pela Meta
  call: WhatsappCall | null;
  direction: WhatsappCallDirection;
  contactId: string;
  contactName: string;
  phase: ActiveCallPhase;
  isMuted: boolean;
  // Quando a conversa começou, para o cronômetro
  answeredAt: number | null;
};

export type StartCallInput = { contactId: string; contactName: string; configurationId: string };

type CallContextProps = {
  // Pode usar ligações (permissão whatsapp.calls)
  canUseCalls: boolean;
  incomingCalls: WhatsappIncomingCall[];
  activeCall: ActiveCall | null;
  acceptCall: (incoming: WhatsappIncomingCall) => Promise<void>;
  ignoreCall: (callId: string) => void;
  startCall: (input: StartCallInput) => Promise<void>;
  hangUp: () => Promise<void>;
  toggleMute: () => void;
};

export const CallContext = createContext<CallContextProps>({
  canUseCalls: false,
  incomingCalls: [],
  activeCall: null,
  acceptCall: async () => undefined,
  ignoreCall: () => undefined,
  startCall: async () => undefined,
  hangUp: async () => undefined,
  toggleMute: () => undefined,
});

export const useCallContext = () => useContext(CallContext);
