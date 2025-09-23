import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import type { FC } from "react";
import { FaRobot } from "react-icons/fa";
import { FiFile, FiImage, FiMic, FiUser, FiVideo } from "react-icons/fi";

type WhatsappChatContactMessageProps = {
  messageContentType: string | undefined;
  isIncoming: boolean;
  children: React.ReactNode;
};

export const WhatsappChatContactMessage: FC<WhatsappChatContactMessageProps> = ({ isIncoming, messageContentType, children }) => (
  <div className="grid grid-cols-[min-content_1fr] items-center [&>svg]:mr-1">
    {messageContentType === WhatsappMessageContentType.AUDIO && <FiMic />}
    {messageContentType === WhatsappMessageContentType.CONTACTS && <FiUser />}
    {messageContentType === WhatsappMessageContentType.DOCUMENT && <FiFile />}
    {messageContentType === WhatsappMessageContentType.IMAGE && <FiImage />}
    {messageContentType === WhatsappMessageContentType.VIDEO && <FiVideo />}
    {messageContentType === WhatsappMessageContentType.TEMPLATE && <FaRobot />}
    <p
      data-incoming={isIncoming}
      className="text-foreground/50 data-[incoming=true]:text-foreground/80 col-start-2 truncate text-sm data-[incoming=true]:font-bold"
    >
      {children}
    </p>
  </div>
);
