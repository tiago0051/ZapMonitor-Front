import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestErrorHandling } from "@/utils/request";
import { FileText, Loader2 } from "lucide-react";
import { useId, useState, type FC } from "react";
import { headerFileAccept, headerFileLabel, headerFileType, uploadTemplateHeaderFile } from "./templateUtils";

type TemplateHeaderFileInputProps = {
  clientId: string;
  // Número da conta do modelo; o arquivo fica guardado no cliente e vale para qualquer envio depois
  configurationId: string | null;
  template: WhatsappTemplate | null;
  fileName: string | null | undefined;
  hasFile: boolean;
  onUploaded: (file: { fileId: string; fileName: string }) => void;
};

/**
 * Arquivo fixo do cabeçalho de um modelo com imagem, vídeo ou PDF, para envios automáticos (follow-up, lembretes).
 * Sobe na hora em que é escolhido; não aparece quando o modelo não tem mídia no cabeçalho.
 */
export const TemplateHeaderFileInput: FC<TemplateHeaderFileInputProps> = ({
  clientId,
  configurationId,
  template,
  fileName,
  hasFile,
  onUploaded,
}) => {
  const id = useId();
  const [isUploading, setIsUploading] = useState(false);
  const fileType = headerFileType(template);
  if (!fileType) return null;

  const handleFile = async (file: File | undefined) => {
    if (!file || !configurationId) return;
    setIsUploading(true);
    try {
      const fileId = await uploadTemplateHeaderFile(clientId, configurationId, fileType, file);
      onUploaded({ fileId, fileName: file.name });
    } catch (error) {
      requestErrorHandling(error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{headerFileLabel[fileType]}</Label>
      {hasFile && (
        <p className="flex items-center gap-1.5 text-sm">
          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
          <span className="truncate">{fileName || "Arquivo enviado"}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="file"
          accept={headerFileAccept[fileType]}
          disabled={isUploading || !configurationId}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        {isUploading && <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" aria-label="Enviando arquivo" />}
      </div>
      <p className="text-muted-foreground text-xs">
        {hasFile ? "Escolha outro arquivo para trocar. " : ""}O mesmo arquivo vai em todos os envios deste modelo.
      </p>
    </div>
  );
};
