import { Button } from "@/components/ui/button";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { WhatsappMessageStatus } from "@/enums/whatsappMessageStatus.enum";
import { WhatsappMessageType } from "@/enums/whatsappMessageType.enum";
import { socket } from "@/services/socket/socket";
import { formatShortName } from "@/utils/formatString";
import { format } from "date-fns";
import { useEffect, useState, type FC } from "react";
import {
  IoCheckmarkDoneOutline,
  IoCheckmarkOutline,
  IoTimeOutline,
} from "react-icons/io5";

type WhatsappChatMessageListItemProps = {
  message: WhatsappMessage;
};

export const WhatsappChatMessageListItem: FC<
  WhatsappChatMessageListItemProps
> = ({ message }) => {
  const [status, setStatus] = useState(message.status);

  useEffect(() => {
    if (
      message.status === WhatsappMessageStatus.READ ||
      message.type === WhatsappMessageType.INCOMING
    )
      return;

    socket.on(
      `chat:message:${message.id}:update`,
      (data: { status: number }) => {
        setStatus(data.status);
      }
    );

    return () => {
      socket.off(`chat:message:${message.id}:update`);
    };
  }, [message.id, message.type, message.status]);

  return (
    <div
      key={message.id}
      data-type={message.type}
      className="max-w-[50%] min-w-[250px] p-2 pb-5 pt-8 bg-secondary text-secondary-foreground rounded data-[type=1]:self-end relative"
    >
      {message.contentType === WhatsappMessageContentType.TEXT && (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}
      {message.contentType === WhatsappMessageContentType.AUDIO && (
        <div>
          <audio controls src={message.content} className="w-full" />
          {!message.content && <p className="text-xs">Baixando...</p>}
        </div>
      )}
      {message.contentType === WhatsappMessageContentType.IMAGE && (
        <div>
          <img src={message.content} alt="Imagem" className="w-full" />
          {!message.content && <p className="text-xs">Baixando...</p>}
        </div>
      )}
      {message.contentType === WhatsappMessageContentType.VIDEO && (
        <div>
          <video src={message.content} controls className="w-full" />
          {!message.content && <p className="text-xs">Baixando...</p>}
        </div>
      )}
      {message.contentType === WhatsappMessageContentType.DOCUMENT && (
        <div>
          <a href={message.content} target="_blank" download>
            <Button variant={"link"} className="p-0">
              Baixar Documento
            </Button>
          </a>
          {!message.content && <p className="text-xs">Baixando...</p>}
        </div>
      )}

      {message.contentType === WhatsappMessageContentType.CONTACTS && (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}

      {message.contentType === WhatsappMessageContentType.TEMPLATE && (
        <p className="whitespace-pre-wrap">{message.content}</p>
      )}
      <span className="absolute text-xs top-2 right-2">
        {format(message.createdAt, "dd/MM/yyyy HH:mm")}
      </span>
      <span className="absolute text-xs bottom-1 right-2 [&>svg]:size-5">
        {message.type === WhatsappMessageType.OUTGOING && (
          <>
            {status === WhatsappMessageStatus.UNKNOWN ||
              (status === WhatsappMessageStatus.EXECUTED && <IoTimeOutline />)}
            {status === WhatsappMessageStatus.SENT && <IoCheckmarkOutline />}
            {status === WhatsappMessageStatus.DELIVERED && (
              <IoCheckmarkDoneOutline />
            )}
            {status === WhatsappMessageStatus.READ && (
              <IoCheckmarkDoneOutline className="text-blue-500" />
            )}
          </>
        )}
      </span>

      {message.userName && (
        <span className="absolute text-xs top-2 left-2">
          {formatShortName(message.userName)}
        </span>
      )}
    </div>
  );
};
