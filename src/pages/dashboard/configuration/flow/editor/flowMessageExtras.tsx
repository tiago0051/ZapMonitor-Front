import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { BlockBlobClient } from "@azure/storage-blob";
import { Braces, FileAudio, FileText, FileVideo, ImageIcon, Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { textareaClassName } from "../../aiAgent/aiAgentConstants";
import { useFlowEditorContext } from "./flowEditorContext";
import { toFlowVariableKey } from "./flowNodeConfig";

// Variáveis do contato que sempre existem (espelham buildContactVariables do backend)
const CONTACT_VARIABLES = [
  { key: "nome", label: "Nome completo" },
  { key: "primeiro_nome", label: "Primeiro nome" },
  { key: "telefone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "documento", label: "CPF/CNPJ" },
];

type VariableGroup = { title: string; items: { key: string; label: string }[] };

const useFlowVariableGroups = (): VariableGroup[] => {
  const { contactFields, crmFields } = useFlowEditorContext();
  const toItems = (fields: CrmField[]) =>
    fields.map((field) => ({ key: toFlowVariableKey(field.name), label: field.name })).filter((item) => item.key);

  return [
    { title: "Contato", items: CONTACT_VARIABLES },
    { title: "Ficha do contato", items: toItems(contactFields) },
    { title: "Negócio aberto mais recente", items: toItems(crmFields) },
  ].filter((group) => group.items.length > 0);
};

type FlowTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
};

/** Caixa de texto do fluxo com o botão "Variáveis", que insere {{variavel}} onde o cursor está. */
export const FlowVariableTextarea: FC<FlowTextareaProps> = ({ value, onChange, placeholder, maxLength, className }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const groups = useFlowVariableGroups();

  const insert = (key: string) => {
    const token = `{{${key}}}`;
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`;
    onChange(next);
    setOpen(false);
    // Devolve o cursor para logo depois da variável inserida
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <div className="space-y-1">
      <textarea
        ref={textareaRef}
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${textareaClassName} ${className ?? "min-h-24"}`}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
            <Braces className="h-3.5 w-3.5" />
            Inserir variável
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-80 w-72 space-y-2 overflow-y-auto p-2">
          <p className="text-muted-foreground px-1 text-xs">
            Troca pelo dado do contato na hora do envio. Se o dado estiver vazio, a variável some da mensagem.
          </p>
          {groups.map((group) => (
            <div key={group.title}>
              <p className="text-muted-foreground px-1 pt-1 text-xs font-semibold uppercase">{group.title}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={`${group.title}-${item.key}`}>
                    <button
                      type="button"
                      onClick={() => insert(item.key)}
                      className="hover:bg-muted flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-sm"
                    >
                      <span className="truncate">{item.label}</span>
                      <code className="text-muted-foreground shrink-0 text-xs">{`{{${item.key}}}`}</code>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Tipos aceitos pelo armazenamento de anexos do WhatsApp (mesmos limites das mensagens da conversa)
const MEDIA_ACCEPT = "image/jpeg,image/png,video/mp4,audio/aac,audio/amr,audio/mpeg,audio/mp4,audio/ogg,application/pdf";

const mediaKindFromMime = (mimeType: string): FlowMessageMediaKind =>
  mimeType.startsWith("image/") ? "image" : mimeType.startsWith("video/") ? "video" : mimeType.startsWith("audio/") ? "audio" : "document";

const MEDIA_ICONS: Record<FlowMessageMediaKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
};

const MEDIA_LABELS: Record<FlowMessageMediaKind, string> = {
  image: "Imagem",
  video: "Vídeo",
  audio: "Áudio",
  document: "PDF",
};

type FlowMessageMediaFieldProps = {
  clientId: string;
  media: FlowMessageMedia | null | undefined;
  onChange: (media: FlowMessageMedia | null) => void;
};

/** Anexo opcional do nó Mensagem: sobe o arquivo direto para o armazenamento e guarda só o id no fluxo. */
export const FlowMessageMediaField: FC<FlowMessageMediaFieldProps> = ({ clientId, media, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const upload = async (file: File) => {
    const kind = mediaKindFromMime(file.type);
    setIsUploading(true);
    try {
      const { fileId, url } = await flowService.getMediaUploadUrl({
        params: { clientId, fileType: kind },
        body: { fileName: file.name, mimeType: file.type, fileSize: file.size },
      });
      await new BlockBlobClient(url).uploadData(file, { blobHTTPHeaders: { blobContentType: file.type }, blockSize: file.size });
      onChange({ fileId, fileName: file.name, kind });
    } catch (error) {
      requestErrorHandling(error);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  if (media) {
    const Icon = MEDIA_ICONS[media.kind];
    return (
      <div className="flex items-center gap-2 rounded-md border p-2">
        <Icon className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{media.fileName}</span>
          <span className="text-muted-foreground text-xs">{MEDIA_LABELS[media.kind]}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Remover anexo"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={MEDIA_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button type="button" variant="outline" size="sm" className="w-full" disabled={isUploading} onClick={() => inputRef.current?.click()}>
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {isUploading ? "Enviando arquivo..." : "Anexar imagem, PDF, áudio ou vídeo"}
      </Button>
    </>
  );
};
