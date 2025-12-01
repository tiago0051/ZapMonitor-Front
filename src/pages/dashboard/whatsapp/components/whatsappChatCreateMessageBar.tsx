import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { whatsappContants } from "@/contants/whatsappContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { whatsappService } from "@/services/api/whatsappService";
import { convertWavToMp3 } from "@/utils/fileConvert";
import { requestErrorHandling } from "@/utils/request";
import { BlockBlobClient } from "@azure/storage-blob";
import { useMutation } from "@tanstack/react-query";
import { type ChangeEvent, type FC, useEffect, useRef, useState } from "react";
import { FiFile, FiImage, FiMic, FiPaperclip, FiSend, FiStopCircle, FiX } from "react-icons/fi";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";

type WhatsappChatCreateMessageBarProps = {
  contactService: WhatsappContactService;
  whatsappConfigurationId: string;
  updateMessageList: () => void;
};

export const WhatsappChatCreateMessageBar: FC<WhatsappChatCreateMessageBarProps> = ({
  contactService,
  whatsappConfigurationId,
  updateMessageList,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { client } = useClientContext();

  const defaultMessage = {
    type: WhatsappMessageContentType.TEXT,
    value: "",
  };

  const [message, setMessage] = useState<{ type: WhatsappMessageContentType; value: string | Blob | File }>(defaultMessage);
  const messageIsText = message.type === WhatsappMessageContentType.TEXT;
  const messageIsAudio = message.type === WhatsappMessageContentType.AUDIO;
  const messageIsDocument = message.type === WhatsappMessageContentType.DOCUMENT;
  const messageIsImage = message.type === WhatsappMessageContentType.IMAGE;

  const createMessageMutate = useMutation({
    mutationFn: whatsappService.createWhatsappMessage,
    onSuccess: () => {
      updateMessageList();

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
      updateMessageList();
    },
    onError: requestErrorHandling,
  });

  const { status, startRecording, stopRecording, error } = useReactMediaRecorder({
    audio: true,
    mediaRecorderOptions: {
      mimeType: "audio/wav",
    },
    onStop: async (_u, blob) =>
      setMessage({
        type: WhatsappMessageContentType.AUDIO,
        value: blob,
      }),
  });

  async function handleSendMessage() {
    if (messageIsAudio) {
      const blobMp3 = await convertWavToMp3(message.value as Blob);
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
          type: message.type,
          fileId,
        },
      });
    }

    if (messageIsDocument || messageIsImage) {
      const fileId = await uploadFileMutation.mutateAsync({ file: message.value as File, fileType: message.type });

      await createMessageMutate.mutateAsync({
        params: {
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: message.type,
          fileId,
        },
      });
    }

    if (messageIsText) {
      createMessageMutate.mutate({
        params: {
          contactId: contactService.id,
          configurationId: whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: message.type,
          text: message.value as string,
        },
      });

      if (inputRef.current) {
        inputRef.current.style.height = "auto";
      }
    }

    setMessage(defaultMessage);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }

  function onInput(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage({
      type: WhatsappMessageContentType.TEXT,
      value: event.target.value,
    });
    // Auto-resize
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  }

  function selectMediaMessageClick(contentType: WhatsappMessageContentType, acceptsTypes: string) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = false;
    fileInput.accept = acceptsTypes;

    fileInput.onchange = async () => {
      if (fileInput.files) {
        const files = Array.from(fileInput.files);

        if (files?.length === 1) {
          const file = files[0];

          setMessage({
            type: contentType,
            value: file,
          });
        }
      }

      fileInput.value = "";
    };
    fileInput.click();
  }

  const disabledMessage = createMessageMutate.isPending || uploadFileMutation.isPending;
  const isRecording = status === "recording";

  const disableButtonSendMessage = disabledMessage || (messageIsText && !(message.value as string).trim());
  const showDocumentBar = !isRecording && (messageIsDocument || messageIsAudio || messageIsImage);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <div className="flex items-center gap-2 pt-2">
      {!isRecording && messageIsText && (
        <textarea
          className="focus:ring-primary max-h-40 w-full resize-none overflow-auto rounded border px-4 py-2 leading-5 transition focus:ring-2 focus:outline-none"
          placeholder="Sua mensagem"
          onKeyDown={onKeyDown}
          onChange={onInput}
          value={message.value as string}
          ref={inputRef}
          readOnly={disabledMessage}
          aria-label="Digite sua mensagem"
          rows={1}
        />
      )}

      {showDocumentBar && (
        <div className="flex w-full items-center">
          {messageIsDocument && (
            <div className={"flex w-full items-center gap-2"}>
              <FiFile />
              <p>{(message.value as File).name}</p>
            </div>
          )}

          {messageIsAudio && <audio controls src={URL.createObjectURL(message.value as Blob)} className="w-full" />}

          {messageIsImage && (
            <div className={"w-full"}>
              <img src={URL.createObjectURL(message.value as File)} alt={"Imagem selecioanda"} className={"h-[100px]"} />
            </div>
          )}

          <Button variant={"ghost"} size={"icon"} onClick={() => setMessage(defaultMessage)} disabled={disabledMessage}>
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
        {messageIsText && (
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
        {!isRecording && messageIsText && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild disabled={isRecording}>
              <Button variant={"outline"} size={"icon"} disabled={disabledMessage}>
                <FiPaperclip />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent>
              <DropdownMenuItem
                onClick={() => selectMediaMessageClick(WhatsappMessageContentType.DOCUMENT, whatsappContants.DOCUMENT_TYPES)}
              >
                <FiFile />
                Documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => selectMediaMessageClick(WhatsappMessageContentType.IMAGE, whatsappContants.IMAGE_TYPES)}>
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
