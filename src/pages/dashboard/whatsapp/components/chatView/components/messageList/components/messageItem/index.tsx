import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { WhatsappMessageStatus } from "@/enums/whatsappMessageStatus.enum";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { formatShortName, formatWhatsappText } from "@/utils/formatString";
import { format } from "date-fns";
import { useEffect, useState, type FC, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FiAlertTriangle, FiDownload } from "react-icons/fi";
import { IoCheckmarkDoneOutline, IoCheckmarkOutline, IoTimeOutline } from "react-icons/io5";
import { ChevronDown, ChevronUp, Loader2, Megaphone, Reply, RotateCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { MessageReplyPreview } from "../../../messageReplyPreview";
import { TemplateMessage } from "../templateMessage";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";

type MessageFileContent = { url: string; filename: string };

const MessageText = ({ message }: { message: WhatsappMessage<string> }) => (
  <p className="whitespace-pre-wrap">{formatWhatsappText(message.content)}</p>
);
type MediaProps = { content: MessageFileContent | null; status: number; createdAt: string };

// Sem arquivo depois desse tempo, o download provavelmente falhou (o back-end não informa a falha)
const MEDIA_DOWNLOAD_TIMEOUT_MS = 2 * 60 * 1000;

const MediaError: FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="text-muted-foreground flex flex-wrap items-center gap-2 text-xs">
    <FiAlertTriangle className="text-destructive shrink-0" />
    <span>{message}</span>
    {onRetry && (
      <button type="button" onClick={onRetry} className="text-primary inline-flex items-center gap-1 font-medium hover:underline">
        <RotateCw className="size-3" />
        Tentar de novo
      </button>
    )}
  </div>
);

/**
 * Estados do anexo: baixando, falha (sem arquivo depois de um tempo ou envio com erro) e erro ao carregar o link.
 * "Tentar de novo" busca as mensagens outra vez ou recarrega o elemento.
 */
const MessageMedia: FC<MediaProps & { children: (url: string, onError: () => void) => ReactNode }> = ({
  content,
  status,
  createdAt,
  children,
}) => {
  const queryClient = useQueryClient();
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const refetchMessages = () =>
    queryClient.invalidateQueries({ predicate: (query) => query.queryKey[1] === "findAllWhatsappMessagesByContact" });

  // Sem arquivo depois do prazo, troca "Baixando..." pelo aviso com nova tentativa
  const [isStale, setIsStale] = useState(false);
  const hasUrl = !!content?.url;
  useEffect(() => {
    if (hasUrl) return;
    const remaining = new Date(createdAt).getTime() + MEDIA_DOWNLOAD_TIMEOUT_MS - Date.now();
    const timer = window.setTimeout(() => setIsStale(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [hasUrl, createdAt]);

  if (!content?.url) {
    const sendFailed = status === WhatsappMessageStatus.FAILED || status === WhatsappMessageStatus.SENDING_ERROR;
    if (sendFailed) return <MediaError message="Não foi possível obter o arquivo." />;
    if (isStale) return <MediaError message="O arquivo ainda não chegou." onRetry={refetchMessages} />;
    return <p className="text-xs">Baixando...</p>;
  }

  if (loadFailed)
    return (
      <MediaError
        message="Não foi possível carregar o arquivo."
        onRetry={() => {
          setLoadFailed(false);
          setAttempt((current) => current + 1);
        }}
      />
    );

  return <div key={attempt}>{children(content.url, () => setLoadFailed(true))}</div>;
};

const MessageAudio = (props: MediaProps) => (
  <MessageMedia {...props}>{(url, onError) => <audio controls src={url} onError={onError} className="w-full" />}</MessageMedia>
);
const MessageImage = (props: MediaProps) => (
  <MessageMedia {...props}>{(url, onError) => <img src={url} alt="Imagem" onError={onError} className="w-full" />}</MessageMedia>
);
const MessageVideo = (props: MediaProps) => (
  <MessageMedia {...props}>{(url, onError) => <video src={url} controls onError={onError} className="w-full" />}</MessageMedia>
);
const MessageDocument = (props: MediaProps) => (
  <MessageMedia {...props}>
    {(url) => (
      <a href={url} target="_blank" rel="noreferrer" download className="text-primary flex items-center justify-between gap-2">
        <p className="overflow-hidden break-words">{props.content?.filename}</p>
        <FiDownload className="shrink-0" size={20} />
      </a>
    )}
  </MessageMedia>
);
const MessageSticker = (props: MediaProps) => (
  <MessageMedia {...props}>
    {(url, onError) => <img src={url} alt="Figurinha" onError={onError} className="size-36 object-contain" />}
  </MessageMedia>
);
const MessageContact = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;
const MessageTemplate = ({ message }: { message: WhatsappMessage<string> }) => (
  <p className="whitespace-pre-wrap">{formatWhatsappText(message.content)}</p>
);

const supportedContentTypes: string[] = [
  WhatsappMessageContentType.INTERACTIVE,
  WhatsappMessageContentType.TEXT,
  WhatsappMessageContentType.AUDIO,
  WhatsappMessageContentType.IMAGE,
  WhatsappMessageContentType.VIDEO,
  WhatsappMessageContentType.DOCUMENT,
  WhatsappMessageContentType.STICKER,
  WhatsappMessageContentType.CONTACTS,
  WhatsappMessageContentType.TEMPLATE,
];

// Sem resposta da IA nesse tempo, o botão volta para tentar de novo
const DESCRIBE_WAIT_MS = 90 * 1000;

const isPdf = (content: MessageFileContent | null) => !!content?.filename?.toLowerCase().endsWith(".pdf");

/**
 * Imagem e PDF recebidos só são lidos pela IA quando uma etapa de IA precisa; aqui o atendente pede a leitura. O
 * resultado chega pelo socket e aparece como transcrição.
 */
const DescribeMediaButton: FC<{ contactId: string; messageId: string }> = ({ contactId, messageId }) => {
  const { client } = useClientContext();
  const [isWaiting, setIsWaiting] = useState(false);

  useEffect(() => {
    if (!isWaiting) return;
    const timer = setTimeout(() => setIsWaiting(false), DESCRIBE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [isWaiting]);

  const describe = useMutation({
    mutationFn: () => whatsappService.describeMessageMedia({ params: { clientId: client.id, contactId, messageId } }),
    onSuccess: () => setIsWaiting(true),
    onError: requestErrorHandling,
  });

  if (isWaiting)
    return (
      <p role="status" className="text-muted-foreground mt-2 flex items-center gap-1 border-t pt-2 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Lendo com a IA…
      </p>
    );

  return (
    <div className="mt-2 border-t pt-2">
      <button
        type="button"
        onClick={() => describe.mutate()}
        disabled={describe.isPending}
        className="text-primary inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-60"
      >
        <Sparkles className="size-3" />
        Ler com IA
      </button>
    </div>
  );
};

type MessageItemProps = {
  message: WhatsappMessage;
  contactId: string;
  contactName: string;
  onReply?: (message: WhatsappMessage) => void;
};

export const MessageItem: FC<MessageItemProps> = ({ message, contactId, contactName, onReply }) => {
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);

  const status = message.status;
  const content = message.content as string | MessageFileContent;
  const transcribedContent = message.transcribedContent;
  const mediaProps: MediaProps = {
    content: (content as MessageFileContent | null) ?? null,
    status: message.status,
    createdAt: message.createdAt,
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      data-type={message.type}
      data-reacted={!!message.contactReaction}
      className="group bg-secondary text-secondary-foreground relative max-w-[85%] min-w-[min(300px,100%)] rounded p-2 pt-2 pb-6 [overflow-wrap:anywhere] data-[reacted=true]:mb-3 data-[type=1]:self-end data-[type=1]:bg-green-100/50"
    >
      {onReply && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onReply(message)}
          aria-label="Responder mensagem"
          title="Responder"
          className="bg-secondary/90 absolute top-1 right-1 z-10 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:hidden"
        >
          <Reply className="size-4" />
        </Button>
      )}

      {message.replyTo && <MessageReplyPreview replyTo={message.replyTo} contactName={contactName} className="mb-2" />}

      {(message.contentType === WhatsappMessageContentType.TEXT || message.contentType === WhatsappMessageContentType.INTERACTIVE) && (
        <MessageText message={message as WhatsappMessage<string>} />
      )}
      {message.contentType === WhatsappMessageContentType.AUDIO && <MessageAudio {...mediaProps} />}
      {message.contentType === WhatsappMessageContentType.IMAGE && <MessageImage {...mediaProps} />}
      {message.contentType === WhatsappMessageContentType.VIDEO && <MessageVideo {...mediaProps} />}
      {message.contentType === WhatsappMessageContentType.DOCUMENT && <MessageDocument {...mediaProps} />}
      {message.contentType === WhatsappMessageContentType.STICKER && <MessageSticker {...mediaProps} />}

      {message.caption && <p className="mt-1 text-sm break-words whitespace-pre-wrap">{message.caption}</p>}

      {message.contentType === WhatsappMessageContentType.CONTACTS && <MessageContact message={message as WhatsappMessage<string>} />}

      {message.broadcast && (
        <p className="text-muted-foreground mb-1 flex items-center gap-1 text-[11px] font-medium">
          <Megaphone className="size-3" />
          Campanha: {message.broadcast.name}
        </p>
      )}
      {message.contentType === WhatsappMessageContentType.TEMPLATE &&
        (message.template ? (
          <TemplateMessage template={message.template} />
        ) : (
          <MessageTemplate message={message as WhatsappMessage<string>} />
        ))}

      {!supportedContentTypes.includes(message.contentType) && (
        <p className="text-muted-foreground text-sm italic">Tipo de mensagem não suportado</p>
      )}

      {!transcribedContent &&
        message.type === WhatsappMessageType.INCOMING &&
        (message.contentType === WhatsappMessageContentType.IMAGE ||
          (message.contentType === WhatsappMessageContentType.DOCUMENT && isPdf(mediaProps.content))) && (
          <DescribeMediaButton contactId={contactId} messageId={message.id} />
        )}

      {transcribedContent && (
        <div className="mt-2 border-t pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsTranscriptionOpen(!isTranscriptionOpen)}
            className="flex w-full items-center justify-between p-0 text-xs hover:bg-transparent"
          >
            <span className="font-medium">Transcrição</span>
            {isTranscriptionOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>
          {isTranscriptionOpen && (
            <div className="max-h-[200px] overflow-y-auto">
              <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">{transcribedContent}</p>
            </div>
          )}
        </div>
      )}

      <span className="absolute right-0 bottom-1 left-0 flex w-full items-center justify-between gap-4 px-2 text-xs [&>svg]:size-5">
        <div className="grid">{message.userName && <span className="truncate">{formatShortName(message.userName)}</span>}</div>
        <div className="flex items-center gap-4 text-lg">
          {/* Em telas de toque não há hover: o botão de responder fica no rodapé, sem cobrir o conteúdo */}
          {onReply && (
            <button
              type="button"
              onClick={() => onReply(message)}
              aria-label="Responder mensagem"
              className="text-muted-foreground hover:text-foreground -my-1 hidden size-6 items-center justify-center rounded [@media(hover:none)]:inline-flex"
            >
              <Reply className="size-4" />
            </button>
          )}
          <span className="text-xs">{format(message.createdAt, "PPp")}</span>
          {message.type === WhatsappMessageType.OUTGOING && (
            <>
              {status === WhatsappMessageStatus.UNKNOWN || (status === WhatsappMessageStatus.EXECUTED && <IoTimeOutline />)}
              {status === WhatsappMessageStatus.SENT && <IoCheckmarkOutline />}
              {status === WhatsappMessageStatus.DELIVERED && <IoCheckmarkDoneOutline />}
              {status === WhatsappMessageStatus.READ && <IoCheckmarkDoneOutline className="text-blue-500" />}
              {(status === WhatsappMessageStatus.SENDING_ERROR || status === WhatsappMessageStatus.FAILED) && (
                <FiAlertTriangle className="text-red-500" />
              )}
            </>
          )}
        </div>
      </span>

      {message.contactReaction && (
        <span
          className="bg-background absolute -bottom-3 left-2 rounded-full border px-1.5 text-sm leading-6 shadow-sm"
          title="Reação do contato"
        >
          {message.contactReaction}
        </span>
      )}
    </motion.div>
  );
};
