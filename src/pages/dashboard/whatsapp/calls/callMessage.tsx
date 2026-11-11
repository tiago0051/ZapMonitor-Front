import { format } from "date-fns";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOff, PhoneOutgoing } from "lucide-react";
import { motion } from "motion/react";
import type { FC } from "react";
import { formatCallDuration } from "./callFormat";

function describeCall(call: WhatsappCall) {
  const incoming = call.direction === "INCOMING";

  switch (call.status) {
    case "RINGING":
    case "ANSWERING":
      return { label: incoming ? "Ligação recebida tocando" : "Chamando o contato", Icon: PhoneCall, tone: "text-green-700" };
    case "IN_PROGRESS":
      return { label: "Ligação em andamento", Icon: PhoneCall, tone: "text-green-700" };
    case "ENDED":
      return { label: incoming ? "Ligação recebida" : "Ligação feita", Icon: incoming ? PhoneIncoming : PhoneOutgoing, tone: "" };
    case "MISSED":
      return incoming
        ? { label: "Ligação perdida", Icon: PhoneMissed, tone: "text-destructive" }
        : { label: "Ligação não atendida", Icon: PhoneOff, tone: "text-muted-foreground" };
    case "REJECTED":
      return { label: "Ligação recusada pelo contato", Icon: PhoneOff, tone: "text-muted-foreground" };
    default:
      return { label: "Ligação com falha", Icon: PhoneOff, tone: "text-destructive" };
  }
}

/** A ligação na conversa: um registro no meio da conversa, com quem atendeu ou ligou e a duração. */
export const CallMessage: FC<{ message: WhatsappMessage }> = ({ message }) => {
  const call = message.content as WhatsappCall | null;
  if (!call) return null;

  const { label, Icon, tone } = describeCall(call);
  const details = [
    call.durationSeconds !== null && call.status === "ENDED" ? formatCallDuration(call.durationSeconds) : null,
    message.userName ? (call.direction === "INCOMING" ? `atendida por ${message.userName}` : `por ${message.userName}`) : null,
    format(new Date(message.createdAt), "HH:mm"),
  ].filter(Boolean);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="bg-muted text-foreground flex max-w-[85%] items-center gap-2 self-center rounded-full px-3 py-1.5 text-xs"
    >
      <Icon className={`size-4 shrink-0 ${tone}`} aria-hidden />
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground">{details.join(" · ")}</span>
    </motion.div>
  );
};
