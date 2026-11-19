import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmojiPicker } from "@/components/emoji-picker";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { attendantDisplayName } from "@/utils/attendantName";
import { WhatsappMessageContentType } from "@/enums/whatsappMessageContentType.enum";
import { whatsappService } from "@/services/api/whatsappService";
import { convertImageForWhatsapp, convertWavToMp3 } from "@/utils/fileConvert";
import { requestErrorHandling } from "@/utils/request";
import { BlockBlobClient } from "@azure/storage-blob";
import { useMutation } from "@tanstack/react-query";
import {
  type ChangeEvent,
  type ClipboardEvent,
  type FC,
  type MutableRefObject,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FiFile, FiFilm, FiImage, FiMic, FiPaperclip, FiSend, FiStopCircle, FiTrash2, FiX } from "react-icons/fi";
import { useReactMediaRecorder } from "react-media-recorder";
import { toast } from "sonner";
import { MessageReplyPreview } from "../messageReplyPreview";
import { contactDisplayName } from "@/pages/dashboard/whatsapp/contactDisplayName";
import { type DraftMessage, emptyDraftMessage, getDraftMessage, saveDraftMessage } from "@/pages/dashboard/whatsapp/conversationDrafts";
import { useQuickReplyPicker } from "@/pages/dashboard/whatsapp/quickReplies/useQuickReplyPicker";
import { fillQuickReply } from "@/pages/dashboard/whatsapp/quickReplies/quickReplies";
import {
  ATTACHMENT_ACCEPT,
  attachmentKind,
  attachmentProblem,
  fileTypeLabel,
  formatFileSize,
  MAX_ATTACHMENTS,
  nameClipboardFile,
} from "./attachments";

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

type CreateMessageBarProps = {
  contact: WhatsappContactMessage;
  replyingTo?: WhatsappMessage | null;
  onCancelReply?: () => void;
  // A conversa registra aqui quem recebe os arquivos soltos nela (arrastar e soltar)
  addFilesRef?: MutableRefObject<((files: File[]) => void) | null>;
};

/** Miniatura do anexo: imagem com prévia; vídeo e documento com ícone, nome e tamanho. */
const AttachmentChip: FC<{ file: File; onRemove: () => void; disabled: boolean }> = ({ file, onRemove, disabled }) => {
  const kind = attachmentKind(file);
  const previewUrl = useMemo(() => (kind === WhatsappMessageContentType.IMAGE ? URL.createObjectURL(file) : null), [file, kind]);
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <li className="bg-secondary relative flex w-40 shrink-0 items-center gap-2 rounded-md border p-1.5 pr-7">
      {previewUrl ? (
        <img src={previewUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
      ) : (
        <span className="bg-background flex h-10 w-10 shrink-0 items-center justify-center rounded">
          {kind === WhatsappMessageContentType.VIDEO ? <FiFilm /> : <FiFile />}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-xs font-medium" title={file.name}>
          {file.name}
        </span>
        <span className="text-muted-foreground block text-[11px]">
          {fileTypeLabel(file)} · {formatFileSize(file.size)}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remover ${file.name}`}
        className="hover:bg-muted absolute top-1 right-1 rounded p-0.5"
      >
        <FiX className="size-3.5" />
      </button>
    </li>
  );
};

export const CreateMessageBar: FC<CreateMessageBarProps> = ({ contact, replyingTo, onCancelReply, addFilesRef }) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { client } = useClientContext();
  const { user } = useUserContext();

  // Percentual enviado do arquivo; null fora de um upload
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Arquivo da vez quando há vários anexos ("2 de 3")
  const [sendingStep, setSendingStep] = useState<{ current: number; total: number } | null>(null);
  // Começa pelo rascunho da conversa; cada mudança volta para o rascunho, para não se perder ao trocar de conversa
  const [draft, setDraftState] = useState<DraftMessage>(() => getDraftMessage(contact.id) ?? emptyDraftMessage());
  const draftRef = useRef(draft);
  const setDraft = (next: DraftMessage) => {
    draftRef.current = next;
    setDraftState(next);
    saveDraftMessage(contact.id, next);
  };
  const updateDraft = (change: Partial<DraftMessage>) => setDraft({ ...draftRef.current, ...change });

  const hasAudio = !!draft.audio;
  const hasAttachments = draft.attachments.length > 0;

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
  // Descartar durante a gravação: o áudio que o gravador entrega ao parar é jogado fora
  const discardRecording = useRef(false);

  const { status, startRecording, stopRecording, error } = useReactMediaRecorder({
    audio: true,
    mediaRecorderOptions: {
      mimeType: "audio/wav",
    },
    onStart: () => {
      discardRecording.current = false;
      recordingStartedAt.current = Date.now();
      setRecordingSeconds(0);
    },
    onStop: async (_u, blob) => {
      if (recordingStartedAt.current) setRecordingSeconds((Date.now() - recordingStartedAt.current) / 1000);
      recordingStartedAt.current = null;
      if (discardRecording.current) {
        discardRecording.current = false;
        return;
      }
      updateDraft({ audio: blob, attachments: [] });
    },
  });

  function cancelRecording() {
    discardRecording.current = true;
    stopRecording();
  }

  /** Junta arquivos (clipe, colar ou soltar) ao rascunho; recusa os que o WhatsApp não aceita, com o motivo. */
  function addFiles(files: File[]) {
    if (files.length === 0) return;
    if (draftRef.current.audio) {
      toast.info("Envie ou descarte o áudio gravado antes de anexar arquivos");
      return;
    }

    const accepted: File[] = [];
    for (const file of files) {
      const problem = attachmentProblem(file);
      if (problem) toast.error(problem);
      else accepted.push(file);
    }

    const current = draftRef.current.attachments;
    const room = MAX_ATTACHMENTS - current.length;
    if (accepted.length > room) toast.info(`Dá para enviar até ${MAX_ATTACHMENTS} arquivos de uma vez`);
    if (room <= 0 || accepted.length === 0) return;

    updateDraft({ attachments: [...current, ...accepted.slice(0, room)] });
    inputRef.current?.focus();
  }

  // A conversa (arrastar e soltar) chama sempre a versão atual
  const addFilesLatest = useRef(addFiles);
  useEffect(() => {
    addFilesLatest.current = addFiles;
  });
  useEffect(() => {
    if (!addFilesRef) return;
    addFilesRef.current = (files) => addFilesLatest.current(files);
    return () => {
      addFilesRef.current = null;
    };
  }, [addFilesRef]);

  async function handleSendMessage() {
    try {
      await sendMessage();
    } catch {
      // O onError já avisou; o que não foi enviado continua na caixa para o atendente tentar de novo
      return;
    } finally {
      setSendingStep(null);
    }

    setDraft(emptyDraftMessage());
    onCancelReply?.();

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  async function sendMessage() {
    const replyToMessageId = replyingTo?.id;
    const params = { contactId: contact.id, configurationId: contact.whatsappConfigurationId, clientId: client.id };
    const current = draftRef.current;

    if (current.audio) {
      const blobMp3 = await convertWavToMp3(current.audio);
      const file = new File([blobMp3], new Date().getTime().toString(), { type: blobMp3.type });
      const fileId = await uploadFileMutation.mutateAsync({ file, fileType: "audio" });
      await createMessageMutate.mutateAsync({ params, body: { type: WhatsappMessageContentType.AUDIO, fileId, replyToMessageId } });
      return;
    }

    if (current.attachments.length > 0) {
      // Um por vez, na ordem: a legenda vai no primeiro e a resposta citada também
      const caption = current.text.trim() || undefined;
      const total = current.attachments.length;
      for (let index = 0; index < total; index += 1) {
        const original = draftRef.current.attachments[0];
        const kind = attachmentKind(original)!;
        setSendingStep({ current: index + 1, total });

        const file = kind === WhatsappMessageContentType.IMAGE ? await prepareImage(original) : original;
        const fileId = await uploadFileMutation.mutateAsync({ file, fileType: kind });
        await createMessageMutate.mutateAsync({
          params,
          body: { type: kind, fileId, ...(index === 0 ? { caption, replyToMessageId } : {}) },
        });

        // Enviado sai do rascunho: numa falha no meio, só os que faltam ficam para tentar de novo
        const remaining = draftRef.current.attachments.slice(1);
        updateDraft({ attachments: remaining, ...(index === 0 ? { text: "" } : {}) });
        if (index === 0) onCancelReply?.();
      }
      return;
    }

    await createMessageMutate.mutateAsync({
      params,
      body: { type: WhatsappMessageContentType.TEXT, text: current.text, replyToMessageId },
    });
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

  const quickReplyPicker = useQuickReplyPicker({
    text: hasAttachments || hasAudio ? "" : draft.text,
    onSelect: (reply) => {
      const text = fillQuickReply(reply.content, { contactName: contactDisplayName(contact, ""), attendantName: attendantDisplayName(user) });
      updateDraft({ text });
      requestAnimationFrame(() => {
        const input = inputRef.current;
        if (!input) return;
        input.focus();
        input.setSelectionRange(text.length, text.length);
        resizeInput(input);
      });
    },
  });

  function resizeInput(input: HTMLTextAreaElement) {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (quickReplyPicker.handleKeyDown(event)) return;
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      // O texto fica na caixa até o envio terminar; um segundo Enter não pode duplicar a mensagem
      if (!disableButtonSendMessage) handleSendMessage();
    }
  }

  function onInput(event: ChangeEvent<HTMLTextAreaElement>) {
    updateDraft({ text: event.target.value });
    resizeInput(event.target);
  }

  // Print ou arquivo copiado vira anexo; texto colado segue normal
  function onPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files);
    if (files.length === 0) return;
    event.preventDefault();
    addFiles(files.map(nameClipboardFile));
  }

  function insertEmoji(emoji: string) {
    const input = inputRef.current;
    const text = draftRef.current.text;
    const start = input?.selectionStart ?? text.length;
    const end = input?.selectionEnd ?? text.length;
    updateDraft({ text: `${text.slice(0, start)}${emoji}${text.slice(end)}` });
    requestAnimationFrame(() => {
      if (!input) return;
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
      resizeInput(input);
    });
  }

  function selectFiles(accept: string) {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.multiple = true;
    fileInput.accept = accept;

    fileInput.onchange = () => {
      addFiles(Array.from(fileInput.files ?? []));
      fileInput.value = "";
    };
    fileInput.click();
  }

  const disabledMessage = createMessageMutate.isPending || uploadFileMutation.isPending || !!sendingStep;
  const isRecording = status === "recording";

  const disableButtonSendMessage = disabledMessage || (!hasAudio && !hasAttachments && !draft.text.trim());

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  // Rascunho restaurado: a caixa já abre na altura do texto
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input?.value) resizeInput(input);
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const interval = window.setInterval(() => {
      if (recordingStartedAt.current) setRecordingSeconds((Date.now() - recordingStartedAt.current) / 1000);
    }, 500);
    return () => window.clearInterval(interval);
  }, [isRecording]);

  // Um endereço para o áudio gravado (e não um a cada render), liberado quando ele muda
  const audioUrl = useMemo(() => (draft.audio ? URL.createObjectURL(draft.audio) : null), [draft.audio]);
  useEffect(() => {
    if (!audioUrl) return;
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  const contactName = contactDisplayName(contact, "Contato");
  const showTextInput = !isRecording && !hasAudio;

  return (
    <div className="flex flex-col gap-2">
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

      {quickReplyPicker.panel}

      {uploadProgress !== null && (
        <div className="flex items-center gap-2" role="status">
          <Progress value={uploadProgress} aria-label="Progresso do envio do arquivo" className="flex-1" />
          <span className="text-muted-foreground w-32 shrink-0 text-right text-xs tabular-nums">
            {sendingStep && sendingStep.total > 1 ? `${sendingStep.current} de ${sendingStep.total} · ` : "Enviando "}
            {uploadProgress}%
          </span>
        </div>
      )}

      {hasAttachments && !isRecording && (
        <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Arquivos para enviar">
          {draft.attachments.map((file, index) => (
            <AttachmentChip
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              file={file}
              disabled={disabledMessage}
              onRemove={() => updateDraft({ attachments: draft.attachments.filter((_, position) => position !== index) })}
            />
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        {showTextInput && (
          <textarea
            className="focus:ring-primary max-h-40 w-full resize-none overflow-auto rounded border px-4 py-2 leading-5 transition focus:ring-2 focus:outline-none"
            placeholder={hasAttachments ? "Legenda (opcional)" : "Sua mensagem (digite / para respostas rápidas)"}
            onKeyDown={onKeyDown}
            onChange={onInput}
            onPaste={onPaste}
            value={draft.text}
            ref={inputRef}
            readOnly={disabledMessage}
            maxLength={hasAttachments ? 1024 : undefined}
            aria-label={hasAttachments ? "Legenda dos arquivos" : "Digite sua mensagem"}
            rows={1}
          />
        )}

        {hasAudio && !isRecording && audioUrl && (
          <div className="flex w-full min-w-0 items-center gap-2">
            <audio controls src={audioUrl} className="min-w-0 flex-1" aria-label="Áudio gravado" />
            {recordingSeconds > 0 && (
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{formatDuration(recordingSeconds)}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateDraft({ audio: null })}
              disabled={disabledMessage}
              aria-label="Descartar áudio"
            >
              <FiTrash2 />
            </Button>
          </div>
        )}

        {isRecording && (
          <div className="border-destructive flex w-full items-center justify-between gap-2 rounded border px-4 py-2">
            <p className="text-destructive animate-pulse">
              Gravando áudio... <span className="tabular-nums">{formatDuration(recordingSeconds)}</span>
            </p>
            <Button variant="ghost" size="sm" onClick={cancelRecording} aria-label="Descartar gravação">
              <FiTrash2 />
              <span className="hidden sm:inline">Descartar</span>
            </Button>
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
          {!hasAudio && !hasAttachments && (
            <Button
              type="button"
              onClick={() => (isRecording ? stopRecording() : startRecording())}
              disabled={disabledMessage}
              variant={isRecording ? "destructive" : "outline"}
              aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
              size={"icon"}
            >
              {!isRecording && <FiMic />}
              {isRecording && <FiStopCircle />}
            </Button>
          )}
          {showTextInput && <EmojiPicker onSelect={insertEmoji} disabled={disabledMessage} className="hidden sm:inline-flex" />}
          {showTextInput && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={"outline"} size={"icon"} disabled={disabledMessage} aria-label="Anexar arquivo">
                  <FiPaperclip />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => selectFiles(ATTACHMENT_ACCEPT.media)}>
                  <FiImage />
                  Foto ou vídeo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => selectFiles(ATTACHMENT_ACCEPT.document)}>
                  <FiFile />
                  Documento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
};
