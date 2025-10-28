import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { whatsappContants } from "@/contants/whatsappContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { whatsappService } from "@/services/api/whatsappService";
import { convertWavToMp3 } from "@/utils/fileConvert";
import { requestErrorHandling } from "@/utils/request";
import { BlockBlobClient } from "@azure/storage-blob";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FC, useEffect, useRef, useState } from "react";
import { FiFile, FiImage, FiMic, FiPaperclip, FiSend, FiStopCircle, FiX } from "react-icons/fi";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

type WhatsappChatCreateMessageBarProps = {
  contactService: WhatsappContactService;
  whatsappConfigurationId: string;
};

export const WhatsappChatCreateMessageBar: FC<WhatsappChatCreateMessageBarProps> = ({ contactService, whatsappConfigurationId }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { client } = useClientContext();

  const [message, setMessage] = useState<string | Blob>("");
  const messageIsAudio = message instanceof Blob;

  const queryClient = useQueryClient();

  function invalidateFindAllWhatsappMessagesByContactQuery() {
    queryClient.invalidateQueries({
      queryKey: ["findAllWhatsappMessagesByContact"],
    });
  }

  const createMessageMutate = useMutation({
    mutationFn: whatsappService.createWhatsappMessage,
    onSuccess: () => {
      invalidateFindAllWhatsappMessagesByContactQuery();

      inputRef.current?.focus();
    },
    onError: requestErrorHandling,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, fileType }: { file: globalThis.File; fileType: string }) => {
      const { fileId, url } = await whatsappService.getFileDocumentUploadUrl({
        params: {
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
          clientId: client.id,
          fileType: fileType,
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
      invalidateFindAllWhatsappMessagesByContactQuery();
    },
    onError: requestErrorHandling,
  });

  const { status, startRecording, stopRecording, error } = useReactMediaRecorder({
    audio: true,
    mediaRecorderOptions: {
      mimeType: "audio/wav",
    },
    onStop: async (_u, blob) => setMessage(blob),
  });

  async function handleSendMessage() {
    if (messageIsAudio) {
      const blobMp3 = await convertWavToMp3(message);
      const file = new File([blobMp3], new Date().getTime().toString(), { type: blobMp3.type });

      const fileId = await uploadFileMutation.mutateAsync({
        file,
        fileType: "audio",
      });

      await createMessageMutate.mutateAsync({
        params: {
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: WhatsappMessageContentType.AUDIO,
          fileId,
        },
      });
    }

    if (!messageIsAudio) {
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

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }

    setMessage("");
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

  function sendMediaMessageClick(contentType: WhatsappMessageContentType, acceptsTypes: string) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = acceptsTypes;

    fileInput.onchange = async () => {
      if (fileInput.files) {
        const files = Array.from(fileInput.files);

        for (const file of files) {
          const fileId = await uploadFileMutation.mutateAsync({ file, fileType: contentType });

          await createMessageMutate.mutateAsync({
            params: {
              contactId: contactService.id,
              configurationId: whatsappConfigurationId,
              clientId: client.id,
            },
            body: {
              type: contentType,
              fileId,
            },
          });
        }
      }

      fileInput.value = "";
    };
    fileInput.click();
  }

  const disabledMessage = createMessageMutate.isPending || uploadFileMutation.isPending;
  const isRecording = status === "recording";

  const disableButtonSendMessage = disabledMessage || (!messageIsAudio && !message.trim());

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="flex items-center gap-2 pt-2">
      {!isRecording && !messageIsAudio && (
        <textarea
          className="focus:ring-primary max-h-40 w-full resize-none overflow-auto rounded border px-4 py-2 leading-5 transition focus:ring-2 focus:outline-none"
          placeholder="Digite sua mensagem"
          onKeyDown={onKeyDown}
          onChange={onInput}
          value={message}
          ref={inputRef}
          readOnly={disabledMessage}
          aria-label="Digite sua mensagem"
          rows={1}
        />
      )}

      {!isRecording && messageIsAudio && (
        <div className="flex w-full items-center">
          <audio controls src={URL.createObjectURL(message)} className="w-full" />
          <Button variant={"ghost"} size={"icon"} onClick={() => setMessage("")}>
            <FiX />
          </Button>
        </div>
      )}

      {isRecording && (
        <div className="border-destructive w-full animate-pulse rounded border px-4 py-2">
          <p className="text-destructive">Gravando áudio...</p>
        </div>
      )}
      <div className="flex gap-1">
        {!isRecording && (
          <Button type="button" onClick={handleSendMessage} disabled={disableButtonSendMessage} aria-label="Enviar mensagem" size={"icon"}>
            <FiSend />
          </Button>
        )}
        {!messageIsAudio && (
          <Button
            type="button"
            onClick={() => (isRecording ? stopRecording() : startRecording())}
            disabled={disabledMessage}
            variant={isRecording ? "destructive" : "outline"}
            aria-label="Enviar áudio"
            size={"icon"}
          >
            {!isRecording && <FiMic />}
            {isRecording && <FiStopCircle />}
          </Button>
        )}
        {!isRecording && !messageIsAudio && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isRecording}>
              <Button variant={"outline"} size={"icon"} disabled={disabledMessage}>
                <FiPaperclip />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => sendMediaMessageClick(WhatsappMessageContentType.DOCUMENT, whatsappContants.DOCUMENT_TYPES)}>
                <FiFile />
                Documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => sendMediaMessageClick(WhatsappMessageContentType.IMAGE, whatsappContants.IMAGE_TYPES)}>
                <FiImage />
                Imagem
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
