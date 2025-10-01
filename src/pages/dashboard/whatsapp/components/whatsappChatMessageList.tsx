import { useUserContext } from "@/context/UserContext/userContext";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requestErrorHandling } from "@/utils/request";
import { IsTopScrolled } from "@/utils/scroll";
import { WhatsappChatMessageListItem } from "./whatsappChatMessageList/whatsappChatMessageListItem";
import { cn } from "@/lib/utils";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { Button } from "@/components/ui/button";
import { FiFile, FiPaperclip } from "react-icons/fi";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { whatsappContants } from "@/contants/whatsappContants";
import { BlockBlobClient } from "@azure/storage-blob";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useWhatsappContext } from "../whatsappLayout";

type WhatsappChatMessageListProps = {
  contactService: WhatsappContactService;
  whatsappConfigurationId: string;
  className?: string;
};

export const WhatsappChatMessageList = ({ contactService, whatsappConfigurationId, className }: WhatsappChatMessageListProps) => {
  const { user } = useUserContext();
  const { client } = useClientContext();
  const { playSound } = useWhatsappContext();

  const [newMessagesList, setNewMessagesList] = useState<WhatsappMessage[]>([]);

  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const findAllWhatsappMessagesByContact = useInfiniteQuery({
    queryKey: [`contact-${contactService.id}`, "findAllWhatsappMessagesByContact", contactService.id],
    queryFn: async ({ pageParam = 1 }) =>
      await whatsappService.findAllWhatsappMessagesByContact({
        params: {
          contactMessageId: contactService.id,
          clientId: client.id,
        },
        queries: {
          page: pageParam,
          take: 10,
        },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
  });

  const createMessageMutate = useMutation({
    mutationFn: whatsappService.createWhatsappMessage,
    onSuccess: () => {
      findAllWhatsappMessagesByContact.refetch();
      inputRef.current?.focus();
    },
    onError: requestErrorHandling,
  });

  const uploadFileDocumentMutation = useMutation({
    mutationFn: async (file: globalThis.File) => {
      const { fileId, url } = await whatsappService.getFileDocumentUploadUrl({
        params: {
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        },
      });

      const blockBlob = new BlockBlobClient(url);
      await blockBlob.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type },
        blockSize: file.size,
      });

      return fileId;
    },
    onSuccess: () => {
      findAllWhatsappMessagesByContact.refetch();
    },
    onError: requestErrorHandling,
  });

  function onScrollChat(event: React.UIEvent<HTMLDivElement, UIEvent>) {
    const isTopScrolled = IsTopScrolled(event.currentTarget);

    if (isTopScrolled && findAllWhatsappMessagesByContact.hasNextPage && !findAllWhatsappMessagesByContact.isFetching) {
      findAllWhatsappMessagesByContact.fetchNextPage();
    }
  }

  async function handleSendMessage() {
    if (message.trim()) {
      createMessageMutate.mutate({
        params: {
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: WhatsappMessageContentType.TEXT,
          text: message,
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

  function sendFileMessageClick(type: "document") {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;

    switch (type) {
      case "document":
        fileInput.accept = whatsappContants.DOCUMENT_TYPES;
        break;
      default:
        fileInput.accept = "*/*";
    }

    fileInput.onchange = async () => {
      if (fileInput.files) {
        const files = Array.from(fileInput.files);

        for (const file of files) {
          const fileId = await uploadFileDocumentMutation.mutateAsync(file);

          await createMessageMutate.mutateAsync({
            params: {
              contactId: contactService.id,
              configurationId: whatsappConfigurationId,
              clientId: client.id,
            },
            body: {
              type: WhatsappMessageContentType.DOCUMENT,
              fileId,
            },
          });
        }
      }

      fileInput.value = "";
    };
    fileInput.click();
  }

  const disabledSendMessage = createMessageMutate.isPending || uploadFileDocumentMutation.isPending;

  useEffect(() => {
    if (user) {
      socket.emit("chat:subscribe", user.id, contactService.id);
    }
    return () => {
      socket.emit("chat:unsubscribe", contactService.id);
    };
  }, [user, contactService]);

  useEffect(() => {
    socket.on(`contact:${contactService.id}:newMessage`, (data: WhatsappMessage) => {
      playSound();

      setNewMessagesList((prev) => [data, ...prev]);
    });

    return () => {
      socket.off(`contact:${contactService.id}:newMessage`);
    };
  }, [contactService.id, playSound]);

  useEffect(() => {
    setNewMessagesList([]);
  }, [findAllWhatsappMessagesByContact.data]);

  return (
    <div className={cn(className, "grid h-full grid-rows-[auto_50px] overflow-hidden pt-4")}>
      <div onScroll={onScrollChat} className="flex max-h-full flex-col-reverse gap-2 overflow-auto px-4">
        {newMessagesList.map((message) => (
          <WhatsappChatMessageListItem message={message} key={message.id} />
        ))}

        {findAllWhatsappMessagesByContact.data?.pages.map((page) =>
          page.items.map((message) => <WhatsappChatMessageListItem message={message} key={message.id} />),
        )}

        {findAllWhatsappMessagesByContact.isFetching &&
          new Array(3).fill({}).map((_v, index) => (
            <div key={index} data-my={index % 2 === 0} className="bg-secondary w-5/6 shrink-0 rounded-sm p-2 data-[my=true]:self-end">
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
      </div>

      {contactService.canBeSentMessage && (
        <div className="flex items-center gap-2 px-4 pt-2">
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
          <div className="flex gap-1">
            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={disabledSendMessage || !message.trim()}
              aria-label="Enviar mensagem"
            >
              Enviar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={"outline"} disabled={disabledSendMessage}>
                  <FiPaperclip />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => sendFileMessageClick("document")}>
                  <FiFile />
                  Documento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
    </div>
  );
};
