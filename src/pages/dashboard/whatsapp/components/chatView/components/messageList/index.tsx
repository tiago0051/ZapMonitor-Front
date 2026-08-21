import { Skeleton } from "@/components/ui/skeleton";
import { MessageItem } from "./components/messageItem";
import { useContactMessages } from "./hooks/useContactMessages";

type MessageListProps = {
  contact: WhatsappContactMessage;
};

export const MessageList = ({ contact }: MessageListProps) => {
  const { onScrollChat, isFetching, messages } = useContactMessages({
    contact,
  });

  return (
    <div className={"grid h-full grid-rows-[auto_min-content] overflow-hidden pt-4"}>
      <div onScroll={onScrollChat} className="flex max-h-full flex-col-reverse gap-2 overflow-auto px-4">
        {messages.map((message) => (
          <MessageItem contact={contact} message={message} key={message.id} />
        ))}

        {isFetching &&
          new Array(3).fill({}).map((_v, index) => (
            <div key={index} data-my={index % 2 === 0} className="bg-secondary w-5/6 shrink-0 rounded-sm p-2 data-[my=true]:self-end">
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
      </div>
    </div>
  );
};
