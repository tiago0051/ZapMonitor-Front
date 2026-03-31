import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import type { FC } from "react";
import { FaRobot } from "react-icons/fa";
import { FiFile, FiImage, FiMessageCircle, FiMic, FiUser, FiVideo } from "react-icons/fi";

type WhatsappChatContactMessageProps = {
  messageContentType: string | undefined;
  isIncoming: boolean;
  children: React.ReactNode;
};

export const WhatsappChatContactMessage: FC<WhatsappChatContactMessageProps> = ({ isIncoming, messageContentType, children }) => (
  <div
    data-incoming={isIncoming}
    className="text-foreground/50 data-[incoming=true]:text-foreground group grid grid-cols-[min-content_1fr] items-center [&>svg]:mr-1 [&>svg]:self-start [&>svg]:text-xl"
  >
    {messageContentType === WhatsappMessageContentType.TEXT && <FiMessageCircle />}
    {messageContentType === WhatsappMessageContentType.AUDIO && <FiMic />}
    {messageContentType === WhatsappMessageContentType.CONTACTS && <FiUser />}
    {messageContentType === WhatsappMessageContentType.DOCUMENT && <FiFile />}
    {messageContentType === WhatsappMessageContentType.IMAGE && <FiImage />}
    {messageContentType === WhatsappMessageContentType.VIDEO && <FiVideo />}
    {messageContentType === WhatsappMessageContentType.TEMPLATE && <FaRobot />}

    <p className="col-start-2 text-sm font-light group-data-[incoming=true]:font-normal">{children}</p>
  </div>
);
