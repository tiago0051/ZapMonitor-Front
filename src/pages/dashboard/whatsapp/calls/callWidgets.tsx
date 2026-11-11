import { Button } from "@/components/ui/button";
import { formatPhoneNumber } from "@/utils/formatString";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type FC } from "react";
import { useCallContext, type ActiveCall } from "./callContext";
import { formatCallDuration } from "./callFormat";

const CallTimer: FC<{ since: number }> = ({ since }) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  return <span className="tabular-nums">{formatCallDuration(Math.max(0, Math.floor((now - since) / 1000)))}</span>;
};

const phaseLabel: Record<ActiveCall["phase"], string> = {
  connecting: "Conectando o áudio…",
  ringing: "Chamando…",
  in_progress: "Em ligação",
};

const IncomingCallCard: FC<{ incoming: WhatsappIncomingCall; isBusy: boolean }> = ({ incoming, isBusy }) => {
  const { acceptCall, ignoreCall } = useCallContext();
  const name = incoming.contact?.name || "Contato";
  const phoneNumber = incoming.contact?.phoneNumber ? formatPhoneNumber(incoming.contact.phoneNumber) : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      role="alertdialog"
      aria-label={`Ligação de ${name}`}
      className="bg-card text-card-foreground flex items-center gap-3 rounded-xl border p-3 shadow-lg"
    >
      <span className="flex size-10 shrink-0 animate-pulse items-center justify-center rounded-full bg-green-100 text-green-700">
        <Phone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="text-muted-foreground truncate text-xs">
          Ligação pelo WhatsApp{phoneNumber && name !== phoneNumber ? ` · ${phoneNumber}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => ignoreCall(incoming.call.id)}>
          Ignorar
        </Button>
        <Button
          size="sm"
          className="bg-green-600 text-white hover:bg-green-700"
          disabled={isBusy}
          title={isBusy ? "Encerre a ligação atual para atender" : undefined}
          onClick={() => void acceptCall(incoming)}
        >
          <Phone className="size-4" />
          Atender
        </Button>
      </div>
    </motion.div>
  );
};

const ActiveCallPanel: FC<{ activeCall: ActiveCall }> = ({ activeCall }) => {
  const { hangUp, toggleMute } = useCallContext();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      role="region"
      aria-label={`Ligação com ${activeCall.contactName}`}
      className="flex items-center gap-3 rounded-xl border bg-zinc-900 p-3 text-white shadow-lg dark:bg-zinc-800"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-600">
        <Phone className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{activeCall.contactName}</p>
        <p className="truncate text-xs text-white/70" aria-live="polite">
          {activeCall.phase === "in_progress" && activeCall.answeredAt ? (
            <CallTimer since={activeCall.answeredAt} />
          ) : (
            phaseLabel[activeCall.phase]
          )}
          {activeCall.isMuted && " · microfone desligado"}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button
          size="icon"
          variant="ghost"
          className="text-white hover:bg-white/10 hover:text-white"
          aria-label={activeCall.isMuted ? "Ligar o microfone" : "Desligar o microfone"}
          aria-pressed={activeCall.isMuted}
          title={activeCall.isMuted ? "Ligar o microfone" : "Desligar o microfone"}
          disabled={activeCall.phase === "connecting"}
          onClick={toggleMute}
        >
          {activeCall.isMuted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
        </Button>
        <Button
          size="icon"
          className="bg-red-600 text-white hover:bg-red-700"
          aria-label="Desligar"
          title="Desligar"
          onClick={() => void hangUp()}
        >
          <PhoneOff className="size-4" />
        </Button>
      </div>
    </motion.div>
  );
};

/** Cartões flutuantes: a ligação em andamento e as ligações recebidas tocando. */
export const CallWidgets: FC = () => {
  const { incomingCalls, activeCall } = useCallContext();

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col gap-2 sm:left-auto sm:w-96 [&>*]:pointer-events-auto">
      <AnimatePresence initial={false}>
        {activeCall && <ActiveCallPanel key="active" activeCall={activeCall} />}
        {incomingCalls.map((incoming) => (
          <IncomingCallCard key={incoming.call.id} incoming={incoming} isBusy={!!activeCall} />
        ))}
      </AnimatePresence>
    </div>
  );
};
