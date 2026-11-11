import { useClientContext } from "@/context/ClientContext/clientContext";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappCallService } from "@/services/api/whatsappCallService";
import { requestErrorHandling } from "@/utils/request";
import { useCallback, useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { toast } from "sonner";
import { CallContext, type ActiveCall, type StartCallInput } from "./callContext";
import { CallWidgets } from "./callWidgets";
import { startRingtone } from "./ringtone";
import { MicrophoneError, createAnswer, createOffer, createPeerConnection, getMicrophone } from "./webrtc";

const FINISHED_STATUSES: WhatsappCallStatus[] = ["ENDED", "MISSED", "REJECTED", "FAILED"];

// Por que a ligação terminou, do ponto de vista de quem estava nela
function endedMessage(call: WhatsappCall) {
  if (call.status === "REJECTED") return "O contato recusou a ligação";
  if (call.status === "MISSED") return call.direction === "OUTGOING" ? "O contato não atendeu" : "O contato desligou antes de atender";
  if (call.status === "FAILED") return "A ligação falhou";
  return "Ligação encerrada";
}

/**
 * Ligações pelo WhatsApp na tela de atendimento. O áudio vai direto entre o navegador e a Meta (WebRTC); a API só
 * repassa a oferta e a resposta de áudio. Uma ligação recebida toca para todos com a permissão; o primeiro que atende
 * fica com ela. Sair do atendimento desliga a ligação em andamento.
 */
export const CallProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const { client, can } = useClientContext();
  const { user } = useUserContext();
  const { socket, isConnected } = useSocketContext();
  const canUseCalls = can("whatsapp.calls");

  const [incomingCalls, setIncomingCalls] = useState<WhatsappIncomingCall[]>([]);
  const [ignoredCallIds, setIgnoredCallIds] = useState<string[]>([]);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  // A ligação atual também em ref: os eventos do socket chegam fora do ciclo de renderização
  const activeCallRef = useRef<ActiveCall | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Resposta de áudio que chegou antes de a API devolver o id da ligação feita
  const pendingAnswersRef = useRef(new Map<string, string>());

  const updateActiveCall = useCallback((next: ActiveCall | null | ((current: ActiveCall | null) => ActiveCall | null)) => {
    const value = typeof next === "function" ? next(activeCallRef.current) : next;
    activeCallRef.current = value;
    setActiveCall(value);
  }, []);

  const releaseMedia = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (audioRef.current) audioRef.current.srcObject = null;
    updateActiveCall(null);
  }, [updateActiveCall]);

  const playRemote = useCallback((stream: MediaStream) => {
    audioRef.current ??= Object.assign(document.createElement("audio"), { autoplay: true });
    audioRef.current.srcObject = stream;
    void audioRef.current.play().catch(() => undefined);
  }, []);

  const preparePeer = useCallback(async () => {
    const stream = await getMicrophone();
    streamRef.current = stream;

    const pc = createPeerConnection(stream, playRemote);
    pc.onconnectionstatechange = () => {
      if (pc.connectionState !== "failed" || pcRef.current !== pc) return;

      toast.error("A conexão de áudio caiu");
      const callId = activeCallRef.current?.call?.id;
      if (callId) void whatsappCallService.terminateCall({ params: { clientId: client.id, callId } }).catch(() => undefined);
      releaseMedia();
    };
    pcRef.current = pc;

    return pc;
  }, [client.id, playRemote, releaseMedia]);

  const failCall = useCallback(
    (error: unknown) => {
      releaseMedia();
      if (error instanceof MicrophoneError) toast.error(error.message);
      else requestErrorHandling(error);
    },
    [releaseMedia],
  );

  // -------------------------------------------------------------------------------------------------------------
  // Ações
  // -------------------------------------------------------------------------------------------------------------

  const acceptCall = useCallback(
    async (incoming: WhatsappIncomingCall) => {
      if (activeCallRef.current) {
        toast.error("Encerre a ligação atual antes de atender outra");
        return;
      }
      if (!incoming.sdpOffer) {
        toast.error("Esta ligação não pode mais ser atendida");
        return;
      }

      setIncomingCalls((calls) => calls.filter((item) => item.call.id !== incoming.call.id));
      updateActiveCall({
        call: incoming.call,
        direction: "INCOMING",
        contactId: incoming.call.contactId,
        contactName: incoming.contact?.name || incoming.contact?.phoneNumber || "Contato",
        phase: "connecting",
        isMuted: false,
        answeredAt: null,
      });

      try {
        const pc = await preparePeer();
        const sdp = await createAnswer(pc, incoming.sdpOffer);
        const call = await whatsappCallService.acceptCall({ params: { clientId: client.id, callId: incoming.call.id }, body: { sdp } });

        updateActiveCall((current) => current && { ...current, call, phase: "in_progress", answeredAt: Date.now() });
      } catch (error) {
        failCall(error);
      }
    },
    [client.id, failCall, preparePeer, updateActiveCall],
  );

  const applyAnswer = useCallback(async (sdp: string) => {
    try {
      await pcRef.current?.setRemoteDescription({ type: "answer", sdp });
    } catch {
      toast.error("Não foi possível conectar o áudio da ligação");
    }
  }, []);

  const startCall = useCallback(
    async ({ contactId, contactName, configurationId }: StartCallInput) => {
      if (activeCallRef.current) {
        toast.error("Encerre a ligação atual antes de fazer outra");
        return;
      }

      updateActiveCall({
        call: null,
        direction: "OUTGOING",
        contactId,
        contactName,
        phase: "connecting",
        isMuted: false,
        answeredAt: null,
      });

      try {
        const pc = await preparePeer();
        const sdp = await createOffer(pc);
        const call = await whatsappCallService.startCall({ params: { clientId: client.id, contactId, configurationId }, body: { sdp } });

        // Desligou enquanto a ligação era criada: cancela na Meta também
        if (!activeCallRef.current) {
          void whatsappCallService.terminateCall({ params: { clientId: client.id, callId: call.id } }).catch(() => undefined);
          return;
        }

        updateActiveCall((current) => current && { ...current, call, phase: "ringing" });

        const pendingAnswer = pendingAnswersRef.current.get(call.id);
        if (pendingAnswer) {
          pendingAnswersRef.current.delete(call.id);
          await applyAnswer(pendingAnswer);
          updateActiveCall((current) => current && { ...current, phase: "in_progress", answeredAt: Date.now() });
        }
      } catch (error) {
        // Desligou enquanto preparava o áudio: não é erro
        if (!activeCallRef.current) return;
        failCall(error);
      }
    },
    [applyAnswer, client.id, failCall, preparePeer, updateActiveCall],
  );

  const hangUp = useCallback(async () => {
    const callId = activeCallRef.current?.call?.id;
    releaseMedia();
    if (!callId) return;

    try {
      await whatsappCallService.terminateCall({ params: { clientId: client.id, callId } });
    } catch (error) {
      requestErrorHandling(error);
    }
  }, [client.id, releaseMedia]);

  const toggleMute = useCallback(() => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;

    track.enabled = !track.enabled;
    updateActiveCall((current) => current && { ...current, isMuted: !track.enabled });
  }, [updateActiveCall]);

  const ignoreCall = useCallback((callId: string) => setIgnoredCallIds((ids) => [...ids, callId]), []);

  // -------------------------------------------------------------------------------------------------------------
  // Socket
  // -------------------------------------------------------------------------------------------------------------

  // Quem abre o atendimento com uma ligação já tocando também vê o toque
  useEffect(() => {
    if (!canUseCalls || !isConnected) return;

    whatsappCallService
      .findRingingCalls({ params: { clientId: client.id } })
      .then((calls) => setIncomingCalls(calls.filter((item) => item.call.status === "RINGING")))
      .catch(() => undefined);
  }, [canUseCalls, client.id, isConnected]);

  useEffect(() => {
    if (!canUseCalls) return;

    const onIncoming = (incoming: WhatsappIncomingCall) => {
      if (incoming.call.status !== "RINGING") return;
      setIncomingCalls((calls) => (calls.some((item) => item.call.id === incoming.call.id) ? calls : [...calls, incoming]));
    };

    const onUpdate = (call: WhatsappCall) => {
      if (call.status !== "RINGING") setIncomingCalls((calls) => calls.filter((item) => item.call.id !== call.id));

      const current = activeCallRef.current;
      if (current?.call?.id !== call.id) return;

      if (FINISHED_STATUSES.includes(call.status)) {
        releaseMedia();
        toast(endedMessage(call));
        return;
      }

      if (call.status === "IN_PROGRESS" && current.phase !== "in_progress" && current.direction === "INCOMING") {
        updateActiveCall({ ...current, call, phase: "in_progress", answeredAt: current.answeredAt ?? Date.now() });
      }
    };

    const onAnswer = (answer: WhatsappCallAnswer) => {
      if (answer.userId && answer.userId !== user?.id) return;

      const current = activeCallRef.current;
      if (!current || current.direction !== "OUTGOING") return;

      // A resposta chegou antes do id da ligação: guarda para quando a API responder
      if (!current.call) {
        pendingAnswersRef.current.set(answer.callId, answer.sdp);
        return;
      }
      if (current.call.id !== answer.callId) return;

      void applyAnswer(answer.sdp);
      updateActiveCall({ ...current, phase: "in_progress", answeredAt: Date.now() });
    };

    socket.on("call:incoming", onIncoming);
    socket.on("call:update", onUpdate);
    socket.on("call:answer", onAnswer);

    return () => {
      socket.off("call:incoming", onIncoming);
      socket.off("call:update", onUpdate);
      socket.off("call:answer", onAnswer);
    };
  }, [applyAnswer, canUseCalls, releaseMedia, socket, updateActiveCall, user?.id]);

  // -------------------------------------------------------------------------------------------------------------
  // Toque, saída da página e desmontagem
  // -------------------------------------------------------------------------------------------------------------

  const visibleIncomingCalls = useMemo(
    () => incomingCalls.filter((item) => !ignoredCallIds.includes(item.call.id)),
    [ignoredCallIds, incomingCalls],
  );

  const shouldRing = visibleIncomingCalls.length > 0 && !activeCall;
  useEffect(() => {
    if (!shouldRing) return;

    return startRingtone();
  }, [shouldRing]);

  useEffect(() => {
    if (!activeCall) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [activeCall]);

  // Sair do atendimento desliga: o áudio não sobrevive fora desta tela
  useEffect(
    () => () => {
      const callId = activeCallRef.current?.call?.id;
      pcRef.current?.close();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (callId) void whatsappCallService.terminateCall({ params: { clientId: client.id, callId } }).catch(() => undefined);
    },
    [client.id],
  );

  return (
    <CallContext.Provider
      value={{
        canUseCalls,
        incomingCalls: visibleIncomingCalls,
        activeCall,
        acceptCall,
        ignoreCall,
        startCall,
        hangUp,
        toggleMute,
      }}
    >
      {children}
      {canUseCalls && <CallWidgets />}
    </CallContext.Provider>
  );
};
