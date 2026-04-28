import { useSocketContext } from "@/context/SocketContext/socketContext";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { WhatsappMessageStatus } from "@/enums/whatsappMessageStatus.enum";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { formatShortName } from "@/utils/formatString";
import { format } from "date-fns";
import { useEffect, useState, type FC } from "react";
import { FiDownload } from "react-icons/fi";
import { IoCheckmarkDoneOutline, IoCheckmarkOutline, IoTimeOutline } from "react-icons/io5";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

type MessageFileContent = { url: string; filename: string };

const MessageText = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;
const MessageAudio = ({ content }: { content: MessageFileContent }) => (
  <div>
    {content && <audio controls src={content.url} className="w-full" />}
    {!content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageImage = ({ content }: { content: MessageFileContent }) => (
  <div>
    {content && <img src={content.url} alt="Imagem" className="w-full" />}
    {!content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageVideo = ({ content }: { content: MessageFileContent }) => (
  <div>
    {content && <video src={content.url} controls className="w-full" />}
    {!content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageDocument = ({ content }: { content: MessageFileContent }) => (
  <div>
    {content && (
      <a href={content.url} target="_blank" download className="text-primary flex items-center justify-between gap-2">
        <p className="overflow-hidden break-words">{content.filename}</p>
        <FiDownload className="shrink-0" size={20} />
      </a>
    )}
    {!content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageContact = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;
const MessageTemplate = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;

type WhatsappChatMessageListItemProps = {
  contactService: WhatsappContactService;
  message: WhatsappMessage;
};

export const WhatsappChatMessageListItem: FC<WhatsappChatMessageListItemProps> = ({ message, contactService }) => {
  const { socket, isConnected } = useSocketContext();

  const [status, setStatus] = useState(message.status);
  const [content, setContent] = useState<string | MessageFileContent>(message.content as string | MessageFileContent);
  const [transcribedContent, setTranscribedContent] = useState<string | null | undefined>(message.transcribedContent);
  const [isTranscriptionOpen, setIsTranscriptionOpen] = useState(false);

  useEffect(() => {
    socket.on(`contact:${contactService.id}:message:${message.id}`, (data: WhatsappMessage) => {
      setStatus(data.status);
      setContent(data.content as string | MessageFileContent);
      setTranscribedContent(data.transcribedContent);
    });

    return () => {
      socket.off(`contact:${contactService.id}:message:${message.id}`);
    };
  }, [contactService.id, message.id, message.type, message.status, isConnected]);

  return (
    <div
      key={message.id}
      data-type={message.type}
      className="bg-secondary text-secondary-foreground relative max-w-[50%] min-w-[250px] rounded p-2 pt-8 pb-5 data-[type=1]:self-end"
    >
      {message.contentType === WhatsappMessageContentType.TEXT && <MessageText message={message as WhatsappMessage<string>} />}
      {message.contentType === WhatsappMessageContentType.AUDIO && <MessageAudio content={content as MessageFileContent} />}
      {message.contentType === WhatsappMessageContentType.IMAGE && <MessageImage content={content as MessageFileContent} />}
      {message.contentType === WhatsappMessageContentType.VIDEO && <MessageVideo content={content as MessageFileContent} />}
      {message.contentType === WhatsappMessageContentType.DOCUMENT && <MessageDocument content={content as MessageFileContent} />}

      {message.contentType === WhatsappMessageContentType.CONTACTS && <MessageContact message={message as WhatsappMessage<string>} />}

      {message.contentType === WhatsappMessageContentType.TEMPLATE && <MessageTemplate message={message as WhatsappMessage<string>} />}

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

      <span className="absolute top-2 right-2 text-xs">{format(message.createdAt, "dd/MM/yyyy HH:mm")}</span>
      <span className="absolute right-2 bottom-1 text-xs [&>svg]:size-5">
        {message.type === WhatsappMessageType.OUTGOING && (
          <>
            {status === WhatsappMessageStatus.UNKNOWN || (status === WhatsappMessageStatus.EXECUTED && <IoTimeOutline />)}
            {status === WhatsappMessageStatus.SENT && <IoCheckmarkOutline />}
            {status === WhatsappMessageStatus.DELIVERED && <IoCheckmarkDoneOutline />}
            {status === WhatsappMessageStatus.READ && <IoCheckmarkDoneOutline className="text-blue-500" />}
          </>
        )}
      </span>

      {message.userName && <span className="absolute top-2 left-2 text-xs">{formatShortName(message.userName)}</span>}
    </div>
  );
};
