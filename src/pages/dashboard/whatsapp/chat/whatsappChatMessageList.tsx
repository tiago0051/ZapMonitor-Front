import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import {
  useInfiniteQuery,
  useMutation,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { WhatsappChatMessageListItem } from "./components/whatsappChatMessageList/whatsappChatMessageListItem";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsappChatMessageHeader } from "./components/whatsappChatMessageList/whatsappChatMessageHeader";
import { requestErrorHandling } from "@/utils/request";
import { WhatsappChatMessageListService } from "./components/whatsappChatMessageList/whatsappChatMessageListService/whatsappChatMessageListService";
import { IsTopScrolled } from "@/utils/scroll";
import { cn } from "@/lib/utils";

type WhatsappChatMessageListProps = {
  contactMessage: WhatsappContactMessage;
  onBack: () => void;
  className?: string;
};

export const WhatsappChatMessageList = ({
  contactMessage,
  onBack,
  className,
}: WhatsappChatMessageListProps) => {
  const { user } = useUserContext();

  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const findAllWhatsappMessagesByContact = useInfiniteQuery({
    queryKey: [
      `contact-${contactMessage.id}`,
      "findAllWhatsappMessagesByContact",
      contactMessage.id,
    ],
    queryFn: async ({ pageParam = 1 }) =>
      await whatsappService.findAllWhatsappMessagesByContact({
        params: {
          contactMessageId: contactMessage.id,
        },
        queries: {
          page: pageParam,
          take: 10,
        },
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.canNextPage ? allPages.length + 1 : undefined,
    initialPageParam: 1,
  });

  const findContactServiceByContact = useSuspenseQuery({
    queryKey: [`contact-${contactMessage.id}`, "findContactServiceByContact"],
    queryFn: async () =>
      await whatsappService.findContactServiceByContact({
        params: {
          contactId: contactMessage.id,
        },
      }),
  });

  const contactService = findContactServiceByContact.data;

  const createMessageMutate = useMutation({
    mutationFn: whatsappService.createWhatsappMessage,
    onSuccess: () => {
      findAllWhatsappMessagesByContact.refetch();
      inputRef.current?.focus();
    },
    onError: requestErrorHandling,
  });

  function onScrollChat(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const isTopScrolled = IsTopScrolled(event.currentTarget);

    if (
      isTopScrolled &&
      findAllWhatsappMessagesByContact.hasNextPage &&
      !findAllWhatsappMessagesByContact.isFetching
    ) {
      findAllWhatsappMessagesByContact.fetchNextPage();
    }
  }

  async function handleSendMessage() {
    if (message.trim()) {
      createMessageMutate.mutate({
        params: {
          contactId: contactMessage.id,
          configurationId: contactMessage.whatsappConfigurationId,
        },
        body: {
          message,
        },
      });

      setMessage("");

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function onInput(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);
    // Auto-resize
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  }

  const disabledSendMessage = createMessageMutate.isPending;

  useEffect(() => {
    if (user) {
      socket.emit("chat:subscribe", user.id, contactMessage.id);
    }
    return () => {
      socket.emit("chat:unsubscribe", contactMessage.id);
    };
  }, [user, contactMessage]);

  return (
    <div
      className={cn(className, "grid grid-rows-[min-content_auto] grid-cols-4")}
    >
      <WhatsappChatMessageHeader
        contactMessage={contactMessage}
        onBack={onBack}
        className="col-span-6"
      />

      <div className="grid grid-rows-[auto_50px] h-full overflow-hidden col-span-3 pt-4">
        <div
          onScroll={onScrollChat}
          className="max-h-full overflow-auto flex flex-col-reverse gap-2 px-4"
        >
          {findAllWhatsappMessagesByContact.data?.pages.map((page) =>
            page.items.map((message) => (
              <WhatsappChatMessageListItem message={message} key={message.id} />
            ))
          )}

          {findAllWhatsappMessagesByContact.isFetching &&
            new Array(3).fill({}).map((_v, index) => (
              <div
                key={index}
                data-my={index % 2 === 0}
                className="bg-secondary w-5/6 shrink-0 rounded-sm p-2 data-[my=true]:self-end"
              >
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
        </div>

        {contactService.canBeSentMessage && (
          <div className="flex items-center gap-2 pt-2 px-4">
            <textarea
              className="focus:ring-primary max-h-40 w-full resize-none overflow-auto rounded border px-4 py-2 leading-5 transition focus:ring-2 focus:outline-none"
              placeholder="Digite sua mensagem"
              onKeyDown={onKeyDown}
              onChange={onInput}
              value={message}
              ref={inputRef}
              readOnly={disabledSendMessage}
              aria-label="Digite sua mensagem"
              rows={1}
            />
            <button
              type="button"
              className="bg-primary rounded px-4 py-2 text-white transition disabled:opacity-50"
              onClick={handleSendMessage}
              disabled={disabledSendMessage || !message.trim()}
              aria-label="Enviar mensagem"
            >
              Enviar
            </button>
          </div>
        )}
      </div>

      <WhatsappChatMessageListService contactService={contactService} />
    </div>
  );
};
