import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { WhatsappMessageStatus } from "@/enums/whatsappMessageStatus.enum";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { socket } from "@/services/socket/socket";
import { formatShortName } from "@/utils/formatString";
import { format } from "date-fns";
import { useEffect, useState, type FC } from "react";
import { FiDownload } from "react-icons/fi";
import { IoCheckmarkDoneOutline, IoCheckmarkOutline, IoTimeOutline } from "react-icons/io5";

type MessageDocumentContent = { url: string; filename: string };

const MessageText = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;
const MessageAudio = ({ message }: { message: WhatsappMessage<string> }) => (
  <div>
    <audio controls src={message.content} className="w-full" />
    {!message.content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageImage = ({ message }: { message: WhatsappMessage<string> }) => (
  <div>
    <img src={message.content} alt="Imagem" className="w-full" />
    {!message.content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageVideo = ({ message }: { message: WhatsappMessage<string> }) => (
  <div>
    <video src={message.content} controls className="w-full" />
    {!message.content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageDocument = ({ message }: { message: WhatsappMessage<MessageDocumentContent> }) => (
  <div>
    {message.content && (
      <a href={message.content.url} target="_blank" download className="text-primary flex items-center justify-between gap-2">
        <p className="whitespace-normal">{message.content.filename}</p>
        <FiDownload className="shrink-0" size={20} />
      </a>
    )}
    {!message.content && <p className="text-xs">Baixando...</p>}
  </div>
);
const MessageContact = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;
const MessageTemplate = ({ message }: { message: WhatsappMessage<string> }) => <p className="whitespace-pre-wrap">{message.content}</p>;

type WhatsappChatMessageListItemProps = {
  message: WhatsappMessage;
};

export const WhatsappChatMessageListItem: FC<WhatsappChatMessageListItemProps> = ({ message }) => {
  const [status, setStatus] = useState(message.status);

  useEffect(() => {
    if (message.status === WhatsappMessageStatus.READ || message.type === WhatsappMessageType.INCOMING) return;

    socket.on(`chat:message:${message.id}:update`, (data: { status: number }) => {
      setStatus(data.status);
    });

    return () => {
      socket.off(`chat:message:${message.id}:update`);
    };
  }, [message.id, message.type, message.status]);

  return (
    <div
      key={message.id}
      data-type={message.type}
      className="bg-secondary text-secondary-foreground relative max-w-[50%] min-w-[250px] rounded p-2 pt-8 pb-5 data-[type=1]:self-end"
    >
      {message.contentType === WhatsappMessageContentType.TEXT && <MessageText message={message as WhatsappMessage<string>} />}
      {message.contentType === WhatsappMessageContentType.AUDIO && <MessageAudio message={message as WhatsappMessage<string>} />}
      {message.contentType === WhatsappMessageContentType.IMAGE && <MessageImage message={message as WhatsappMessage<string>} />}
      {message.contentType === WhatsappMessageContentType.VIDEO && <MessageVideo message={message as WhatsappMessage<string>} />}
      {message.contentType === WhatsappMessageContentType.DOCUMENT && (
        <MessageDocument message={message as WhatsappMessage<MessageDocumentContent>} />
      )}

      {message.contentType === WhatsappMessageContentType.CONTACTS && <MessageContact message={message as WhatsappMessage<string>} />}

      {message.contentType === WhatsappMessageContentType.TEMPLATE && <MessageTemplate message={message as WhatsappMessage<string>} />}
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
