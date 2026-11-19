import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { WhatsappServiceStatus } from "@/enums/whatsappServiceStatus.enum";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { contactDisplayName } from "../contactDisplayName";
import type { ContactUpdate } from "../types/contactUpdate";
import { wasSelfAssigned } from "./selfAssignedContacts";
import { isBrowserNotificationSupported, useNotificationPreferences } from "./useNotificationPreferences";

interface UseNewContactNotificationsProps {
  // Grupos do usuário; vazio quando ele não participa de nenhum e vê a fila inteira
  serviceGroupIds: string[];
  selectedContactId?: string;
  onOpenContact: (contact: WhatsappContactMessage, tab: Tab) => void;
}

// Eventos antigos (reconexão, contato atualizado por outro motivo) não devem virar aviso
const RECENT_EVENT_WINDOW_MS = 5 * 60 * 1000;

const isRecent = (date: string | null) => !!date && Date.now() - new Date(date).getTime() < RECENT_EVENT_WINDOW_MS;

// Chega pelo socket logo antes da atualização do contato, com a nota de quem transferiu
type ServiceTransferred = {
  contactId: string;
  toUserId: string | null;
  toServiceGroupId: string | null;
  fromName: string;
  note: string | null;
};

// Colega mencionou alguém numa nota interna; cada tela confere se é o usuário logado
type NoteMention = {
  noteId: string;
  contactId: string;
  contact: WhatsappContactMessage;
  mentionedUserIds: string[];
  fromName: string;
  content: string;
};

// A transferência só enriquece o aviso que vem logo em seguida
const TRANSFER_MATCH_WINDOW_MS = 30 * 1000;

function playNotificationSound() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.2, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.3);

    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.3);
    oscillator.onended = () => audioContext.close();
  } catch {
    // Sem áudio (navegador bloqueou antes de uma interação): o aviso visual continua
  }
}

/** Avisa sobre contatos novos na fila e sobre atribuições e mensagens nos atendimentos do usuário, conforme a preferência de cada aba. */
export const useNewContactNotifications = ({ serviceGroupIds, selectedContactId, onOpenContact }: UseNewContactNotificationsProps) => {
  const { socket } = useSocketContext();
  const { user } = useUserContext();
  const { preferences } = useNotificationPreferences();

  // O handler do socket é registrado uma vez; os valores mudam sem precisar registrar de novo
  const latest = useRef({ preferences, serviceGroupIds, selectedContactId, onOpenContact, userId: user?.id });
  useEffect(() => {
    latest.current = { preferences, serviceGroupIds, selectedContactId, onOpenContact, userId: user?.id };
  });

  const notifiedQueueEntries = useRef(new Map<string, string>());
  const notifiedMessages = useRef(new Map<string, string>());
  // Se cada contato era do usuário no último evento; ausente quando ainda não houve evento dele
  const knownMineContacts = useRef(new Map<string, boolean>());
  const recentTransfers = useRef(new Map<string, ServiceTransferred & { receivedAt: number }>());
  const unseenCount = useRef(0);
  const originalTitle = useRef(document.title);

  // Contador no título enquanto a aba está em segundo plano
  useEffect(() => {
    const title = originalTitle.current;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      unseenCount.current = 0;
      document.title = title;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.title = title;
    };
  }, []);

  useEffect(() => {
    const notify = (contact: WhatsappContactMessage, tab: Tab, title: string, body: string) => {
      const { preferences, onOpenContact } = latest.current;
      const openContact = () => onOpenContact(contact, tab);

      if (preferences.sound) playNotificationSound();

      if (document.visibilityState === "visible") {
        toast.info(title, { description: body, action: { label: "Abrir", onClick: openContact } });
        return;
      }

      unseenCount.current += 1;
      document.title = `(${unseenCount.current}) ${originalTitle.current}`;

      if (!isBrowserNotificationSupported() || Notification.permission !== "granted") return;

      // A tag faz avisos seguidos do mesmo contato substituírem o anterior
      const notification = new Notification(title, { body, tag: `whatsapp-contact-${contact.id}` });
      notification.onclick = () => {
        window.focus();
        openContact();
        notification.close();
      };
    };

    const handleServiceTransferred = (transfer: ServiceTransferred) => {
      const now = Date.now();
      // Descarta as que não viraram aviso (ex.: conversa aberta na tela)
      for (const [contactId, item] of recentTransfers.current)
        if (now - item.receivedAt > TRANSFER_MATCH_WINDOW_MS) recentTransfers.current.delete(contactId);
      recentTransfers.current.set(transfer.contactId, { ...transfer, receivedAt: now });
    };

    // Usa (e descarta) a transferência recente do contato, para o aviso dizer quem passou e a nota
    const takeRecentTransfer = (contactId: string) => {
      const transfer = recentTransfers.current.get(contactId);
      recentTransfers.current.delete(contactId);
      return transfer && Date.now() - transfer.receivedAt < TRANSFER_MATCH_WINDOW_MS ? transfer : null;
    };

    const transferBody = (name: string, transfer: ServiceTransferred | null) => {
      if (!transfer) return name;
      return transfer.note ? `${name} · ${transfer.fromName}: "${transfer.note}"` : `${name} · por ${transfer.fromName}`;
    };

    const handleContactUpdate = ({ contact }: ContactUpdate) => {
      const { preferences, serviceGroupIds, selectedContactId, userId } = latest.current;
      const name = contactDisplayName(contact, contact.phoneNumber);
      const isViewingContact = document.visibilityState === "visible" && selectedContactId === contact.id;

      const isMine = contact.serviceStatus === WhatsappServiceStatus.HUMAN_ACTIVE && !!userId && contact.userIdInService === userId;
      const wasMine = knownMineContacts.current.get(contact.id);
      knownMineContacts.current.set(contact.id, isMine);

      const isIncomingMessage = contact.messageType === WhatsappMessageType.INCOMING;
      const isNewIncomingMessage =
        isIncomingMessage && isRecent(contact.lastMessageAt) && notifiedMessages.current.get(contact.id) !== contact.lastMessageAt;
      if (isIncomingMessage && contact.lastMessageAt) notifiedMessages.current.set(contact.id, contact.lastMessageAt);

      // Contatos sem grupo aparecem na fila de todos os grupos
      const isInMyQueue =
        contact.serviceStatus === WhatsappServiceStatus.WAITING_ATTENDANT &&
        (serviceGroupIds.length === 0 || !contact.serviceGroupId || serviceGroupIds.includes(contact.serviceGroupId));
      const isNewQueueEntry =
        isInMyQueue &&
        !!contact.queueEnteredAt &&
        isRecent(contact.queueEnteredAt) &&
        notifiedQueueEntries.current.get(contact.id) !== contact.queueEnteredAt;
      if (isInMyQueue && contact.queueEnteredAt) notifiedQueueEntries.current.set(contact.id, contact.queueEnteredAt);

      if (isNewQueueEntry && preferences.queue) {
        const transfer = takeRecentTransfer(contact.id);
        const isGroupTransfer = !!transfer?.toServiceGroupId;
        notify(
          contact,
          "queue",
          isGroupTransfer ? "Contato transferido para a fila" : "Contato novo na fila",
          transferBody(name, isGroupTransfer ? transfer : null),
        );
        return;
      }

      if (!preferences.mine || !isMine || isViewingContact) return;

      if (wasMine === false) {
        // Atribuição feita pelo próprio usuário (nesta ou em outra aba) não gera aviso
        if (!wasSelfAssigned(contact.id)) {
          const transfer = takeRecentTransfer(contact.id);
          const isTransferToMe = !!transfer && transfer.toUserId === userId;
          notify(
            contact,
            "mine",
            isTransferToMe ? "Atendimento transferido para você" : "Atendimento atribuído a você",
            transferBody(name, isTransferToMe ? transfer : null),
          );
        }
        return;
      }

      if (isNewIncomingMessage) notify(contact, "mine", `Mensagem de ${name}`, contact.messageContent);
    };

    // Menção vale mesmo sem preferência marcada: alguém chamou a pessoa pelo nome
    const handleNoteMention = (mention: NoteMention) => {
      const { selectedContactId, userId } = latest.current;
      if (!userId || !mention.mentionedUserIds.includes(userId)) return;
      if (document.visibilityState === "visible" && selectedContactId === mention.contactId) return;

      const name = contactDisplayName(mention.contact, mention.contact.phoneNumber);
      notify(mention.contact, "all", `${mention.fromName} mencionou você`, `${name}: ${mention.content}`);
    };

    socket.on("service:transferred", handleServiceTransferred);
    socket.on("contacts:update", handleContactUpdate);
    socket.on("note:mention", handleNoteMention);
    return () => {
      socket.off("service:transferred", handleServiceTransferred);
      socket.off("contacts:update", handleContactUpdate);
      socket.off("note:mention", handleNoteMention);
    };
  }, [socket]);
};
