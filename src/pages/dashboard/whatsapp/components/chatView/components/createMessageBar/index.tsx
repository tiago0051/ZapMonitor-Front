import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { whatsappContants } from "@/contants/whatsappContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { whatsappService } from "@/services/api/whatsappService";
import { convertImageForWhatsapp, convertWavToMp3 } from "@/utils/fileConvert";
import { requestErrorHandling } from "@/utils/request";
import { BlockBlobClient } from "@azure/storage-blob";
import { useMutation } from "@tanstack/react-query";
import { type ChangeEvent, type FC, useEffect, useMemo, useRef, useState } from "react";
import { FiFile, FiImage, FiMic, FiPaperclip, FiSend, FiStopCircle, FiX } from "react-icons/fi";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";
import { MessageReplyPreview } from "../messageReplyPreview";

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
};

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

/** Tipo do arquivo para mostrar ao atendente: extensão do nome ou, sem ela, o subtipo do MIME. */
const fileTypeLabel = (file: File) => {
  const extension = file.name.includes(".") ? file.name.split(".").pop() : "";
  return (extension || file.type.split("/").pop() || "arquivo").toUpperCase();
};

type CreateMessageBarProps = {
  contact: WhatsappContactMessage;
  replyingTo?: WhatsappMessage | null;
  onCancelReply?: () => void;
};

export const CreateMessageBar: FC<CreateMessageBarProps> = ({ contact, replyingTo, onCancelReply }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { client } = useClientContext();

  const defaultMessage = {
    type: WhatsappMessageContentType.TEXT,
    value: "",
  };

  // Percentual enviado do arquivo; null fora de um upload
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: WhatsappMessageContentType; value: string | Blob | File }>(defaultMessage);
  const messageIsText = message.type === WhatsappMessageContentType.TEXT;
  const messageIsAudio = message.type === WhatsappMessageContentType.AUDIO;
  const messageIsDocument = message.type === WhatsappMessageContentType.DOCUMENT;
  const messageIsImage = message.type === WhatsappMessageContentType.IMAGE;

  const createMessageMutate = useMutation({
    mutationFn: whatsappService.createWhatsappMessage,
    onSuccess: () => {
      inputRef.current?.focus();
    },
    onError: requestErrorHandling,
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, fileType }: { file: globalThis.File; fileType: string }) => {
      const { fileId, url } = await whatsappService.getFileDocumentUploadUrl({
        params: {
          contactId: contact.id,
          configurationId: contact.whatsappConfigurationId,
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
      setUploadProgress(0);
      await blockBlob.uploadData(file, {
        blobHTTPHeaders: { blobContentType: file.type },
        blockSize: file.size,
        onProgress: ({ loadedBytes }) => setUploadProgress(file.size ? Math.round((loadedBytes / file.size) * 100) : 100),
      });

      return fileId;
    },
    onError: requestErrorHandling,
    onSettled: () => setUploadProgress(null),
  });

  // Duração do áudio gravado, medida no relógio enquanto grava
  const recordingStartedAt = useRef<number | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const { status, startRecording, stopRecording, error } = useReactMediaRecorder({
    audio: true,
    mediaRecorderOptions: {
      mimeType: "audio/wav",
    },
    onStart: () => {
      recordingStartedAt.current = Date.now();
      setRecordingSeconds(0);
    },
    onStop: async (_u, blob) => {
      if (recordingStartedAt.current) setRecordingSeconds((Date.now() - recordingStartedAt.current) / 1000);
      recordingStartedAt.current = null;
      setMessage({
        type: WhatsappMessageContentType.AUDIO,
        value: blob,
      });
    },
  });

  async function handleSendMessage() {
    try {
      await sendMessage();
    } catch {
      // O onError já avisou; a mensagem continua na caixa para o atendente tentar de novo
      return;
    }

    setMessage(defaultMessage);
    onCancelReply?.();

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  async function sendMessage() {
    const replyToMessageId = replyingTo?.id;

    if (messageIsAudio) {
      const blobMp3 = await convertWavToMp3(message.value as Blob);
      const file = new File([blobMp3], new Date().getTime().toString(), { type: blobMp3.type });

      const fileId = await uploadFileMutation.mutateAsync({
        file,
        fileType: "audio",
      });

      await createMessageMutate.mutateAsync({
        params: {
          contactId: contact.id,
          configurationId: contact.whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: message.type,
          fileId,
          replyToMessageId,
        },
      });
    }

    if (messageIsDocument || messageIsImage) {
      const file = messageIsImage ? await prepareImage(message.value as File) : (message.value as File);
      const fileId = await uploadFileMutation.mutateAsync({ file, fileType: message.type });

      await createMessageMutate.mutateAsync({
        params: {
          contactId: contact.id,
          configurationId: contact.whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: message.type,
          fileId,
          replyToMessageId,
        },
      });
    }

    if (messageIsText) {
      await createMessageMutate.mutateAsync({
        params: {
          contactId: contact.id,
          configurationId: contact.whatsappConfigurationId,
          clientId: client.id,
        },
        body: {
          type: message.type,
          text: message.value as string,
          replyToMessageId,
        },
      });
    }
  }

  // A Meta só aceita JPEG/PNG de 8 bits em RGB; a conversão no navegador evita a falha depois do envio
  async function prepareImage(file: File) {
    try {
      return await convertImageForWhatsapp(file);
    } catch (conversionError) {
      toast.error((conversionError as Error).message);
      throw conversionError;
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      // O texto fica na caixa até o envio terminar; um segundo Enter não pode duplicar a mensagem
      if (!disableButtonSendMessage) handleSendMessage();
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
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    if (!isRecording) return;
    const interval = window.setInterval(() => {
      if (recordingStartedAt.current) setRecordingSeconds((Date.now() - recordingStartedAt.current) / 1000);
    }, 500);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  // Um endereço por anexo (e não um a cada render), liberado quando o anexo muda
  const attachmentUrl = useMemo(
    () => (message.value instanceof Blob && (messageIsAudio || messageIsImage) ? URL.createObjectURL(message.value) : null),
    [message.value, messageIsAudio, messageIsImage],
  );
  useEffect(() => {
    if (!attachmentUrl) return;
    return () => URL.revokeObjectURL(attachmentUrl);
  }, [attachmentUrl]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const contactName = contact.surname?.trim() || contact.name?.trim() || "Contato";

  return (
    <div className="flex flex-col gap-2 pt-2">
      {replyingTo && (
        <MessageReplyPreview
          replyTo={{ id: replyingTo.id, content: replyingTo.content, contentType: replyingTo.contentType, type: replyingTo.type }}
          contactName={contactName}
          className="bg-secondary"
        >
          <Button variant="ghost" size="icon" onClick={onCancelReply} disabled={disabledMessage} aria-label="Cancelar resposta">
            <FiX />
          </Button>
        </MessageReplyPreview>
      )}

      {uploadProgress !== null && (
        <div className="flex items-center gap-2" role="status">
          <Progress value={uploadProgress} aria-label="Progresso do envio do arquivo" className="flex-1" />
          <span className="text-muted-foreground w-24 shrink-0 text-right text-xs tabular-nums">Enviando {uploadProgress}%</span>
        </div>
      )}

      <div className="flex items-center gap-2">
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
          <div className="flex w-full min-w-0 items-center">
            {messageIsDocument && (
              <div className={"flex w-full min-w-0 items-center gap-2"}>
                <FiFile className="shrink-0" />
                <div className="min-w-0">
                  <p className="min-w-0 truncate">{(message.value as File).name}</p>
                  <p className="text-muted-foreground text-xs">
                    {fileTypeLabel(message.value as File)} · {formatFileSize((message.value as File).size)}
                  </p>
                </div>
              </div>
            )}

            {messageIsAudio && attachmentUrl && (
              <div className="flex w-full min-w-0 items-center gap-2">
                <audio controls src={attachmentUrl} className="min-w-0 flex-1" aria-label="Áudio gravado" />
                {recordingSeconds > 0 && (
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{formatDuration(recordingSeconds)}</span>
                )}
              </div>
            )}

            {messageIsImage && (
              <div className={"w-full"}>
                {attachmentUrl && <img src={attachmentUrl} alt={"Imagem selecionada"} className={"h-[100px] max-w-full object-contain"} />}
                <p className="text-muted-foreground truncate text-xs">
                  {(message.value as File).name} · {formatFileSize((message.value as File).size)}
                </p>
              </div>
            )}

            <Button
              variant={"ghost"}
              size={"icon"}
              onClick={() => setMessage(defaultMessage)}
              disabled={disabledMessage}
              aria-label="Remover anexo"
            >
              <FiX />
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="border-destructive w-full animate-pulse rounded border px-4 py-2">
            <p className="text-destructive">
              Gravando áudio... <span className="tabular-nums">{formatDuration(recordingSeconds)}</span>
            </p>
          </div>
        )}
        <div className="flex gap-1">
          {!isRecording && (
            <Button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleSendMessage}
              disabled={disableButtonSendMessage}
              aria-label="Enviar mensagem"
              size={"icon"}
            >
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
                <Button variant={"outline"} size={"icon"} disabled={disabledMessage} aria-label="Anexar arquivo">
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
    </div>
  );
};
