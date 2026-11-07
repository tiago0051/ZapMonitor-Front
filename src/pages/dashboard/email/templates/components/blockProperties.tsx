import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmSelectClassName, crmTextareaClassName } from "@/pages/dashboard/crm/crmUtils";
import { emailTemplateService } from "@/services/api/emailTemplateService";
import { requestErrorHandling } from "@/utils/request";
import { useQuery } from "@tanstack/react-query";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Braces, Plus, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { blockLabels, columnBlockTypes, createBlock, moveItem } from "../blockUtils";

type Props<T extends EmailBlock> = { block: T; onChange: (block: T) => void };

/** Botão que lista as variáveis e devolve o token escolhido. */
export const VariablePicker: FC<{ onPick: (token: string) => void }> = ({ onPick }) => {
  const { client } = useClientContext();
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ["emailTemplates", "variables", client.id],
    queryFn: () => emailTemplateService.variables(client.id),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs">
          <Braces className="h-3.5 w-3.5" />
          Variável
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-72 w-64 overflow-y-auto p-1">
        <p className="text-muted-foreground px-2 py-1.5 text-xs">
          Entra o dado de cada pessoa. Para um valor quando estiver vazio, escreva depois de uma barra:{" "}
          {"{{contato.primeiro_nome|cliente}}"}
        </p>
        {query.data?.map((variable) => (
          <button
            key={variable.key}
            type="button"
            className="hover:bg-accent flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-sm"
            onClick={() => {
              onPick(`{{${variable.key}}}`);
              setOpen(false);
            }}
          >
            {variable.label}
            <span className="text-muted-foreground font-mono text-[11px]">{`{{${variable.key}}}`}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
};

const AlignPicker: FC<{ value: EmailBlockAlign; onChange: (align: EmailBlockAlign) => void }> = ({ value, onChange }) => (
  <div className="grid gap-1.5">
    <Label>Alinhamento</Label>
    <div className="flex gap-1" role="group" aria-label="Alinhamento">
      {(
        [
          ["left", AlignLeft, "Esquerda"],
          ["center", AlignCenter, "Centro"],
          ["right", AlignRight, "Direita"],
        ] as const
      ).map(([align, Icon, label]) => (
        <Button
          key={align}
          type="button"
          size="icon"
          variant={value === align ? "secondary" : "ghost"}
          aria-pressed={value === align}
          aria-label={label}
          className="h-8 w-8"
          onClick={() => onChange(align)}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  </div>
);

const TextField: FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
}> = ({ id, label, value, onChange, multiline, hint }) => (
  <div className="grid gap-1.5">
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={id}>{label}</Label>
      <VariablePicker onPick={(token) => onChange(`${value}${value && !value.endsWith(" ") ? " " : ""}${token}`)} />
    </div>
    {multiline ? (
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} className={cn(crmTextareaClassName, "min-h-32")} />
    ) : (
      <Input id={id} value={value} onChange={(event) => onChange(event.target.value)} />
    )}
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
  </div>
);

const UrlField: FC<{ id: string; label: string; value: string; onChange: (value: string) => void }> = ({ id, label, value, onChange }) => (
  <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <Input id={id} value={value} placeholder="https://" onChange={(event) => onChange(event.target.value)} />
  </div>
);

const ImageProperties: FC<Props<EmailImageBlock>> = ({ block, onChange }) => {
  const { client } = useClientContext();
  const [uploading, setUploading] = useState(false);

  const upload = (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    emailTemplateService
      .uploadImage(client.id, file)
      .then(({ url }) => onChange({ ...block, url, alt: block.alt || file.name.replace(/\.[^.]+$/, "") }))
      .catch(requestErrorHandling)
      .finally(() => setUploading(false));
  };

  return (
    <>
      <div className="grid gap-1.5">
        <Label htmlFor={`img-file-${block.id}`}>Imagem</Label>
        <Input
          id={`img-file-${block.id}`}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          disabled={uploading}
          onChange={(event) => upload(event.target.files?.[0])}
        />
        <p className="text-muted-foreground text-xs">{uploading ? "Enviando..." : "PNG, JPG, GIF ou WEBP, até 2 MB."}</p>
      </div>
      <UrlField
        id={`img-url-${block.id}`}
        label="Ou o endereço da imagem"
        value={block.url}
        onChange={(url) => onChange({ ...block, url })}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`img-alt-${block.id}`}>Descrição (aparece quando a imagem não carrega)</Label>
        <Input id={`img-alt-${block.id}`} value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
      </div>
      <UrlField
        id={`img-link-${block.id}`}
        label="Link ao clicar (opcional)"
        value={block.link ?? ""}
        onChange={(link) => onChange({ ...block, link: link || null })}
      />
      <div className="grid gap-1.5">
        <Label htmlFor={`img-width-${block.id}`}>Largura: {block.width}%</Label>
        <input
          id={`img-width-${block.id}`}
          type="range"
          min={10}
          max={100}
          step={5}
          value={block.width}
          onChange={(event) => onChange({ ...block, width: Number(event.target.value) })}
        />
      </div>
      <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
    </>
  );
};

const ColumnsProperties: FC<Props<EmailColumnsBlock>> = ({ block, onChange }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const setColumn = (index: 0 | 1, items: EmailColumnBlock[]) => {
    const columns: [EmailColumnBlock[], EmailColumnBlock[]] = [...block.columns];
    columns[index] = items;
    onChange({ ...block, columns });
  };

  return (
    <div className="grid gap-4">
      {([0, 1] as const).map((index) => {
        const items = block.columns[index];
        return (
          <div key={index} className="grid gap-2 rounded-lg border p-2">
            <p className="text-sm font-medium">Coluna {index === 0 ? "da esquerda" : "da direita"}</p>
            {items.map((item, itemIndex) => (
              <div key={item.id} className="grid gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 flex-1 truncate rounded px-2 py-1 text-left text-sm",
                      selected === item.id ? "bg-accent" : "hover:bg-accent/50",
                    )}
                    onClick={() => setSelected(selected === item.id ? null : item.id)}
                  >
                    {blockLabels[item.type]}
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Subir"
                    onClick={() => setColumn(index, moveItem(items, itemIndex, itemIndex - 1))}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Descer"
                    onClick={() => setColumn(index, moveItem(items, itemIndex, itemIndex + 1))}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground h-7 w-7"
                    aria-label="Remover"
                    onClick={() =>
                      setColumn(
                        index,
                        items.filter((other) => other.id !== item.id),
                      )
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {selected === item.id && (
                  <div className="grid gap-3 border-l-2 pl-3">
                    <BlockProperties
                      block={item}
                      onChange={(updated) =>
                        setColumn(
                          index,
                          items.map((other) => (other.id === item.id ? (updated as EmailColumnBlock) : other)),
                        )
                      }
                    />
                  </div>
                )}
              </div>
            ))}
            <div className="flex flex-wrap gap-1">
              {columnBlockTypes.map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => setColumn(index, [...items, createBlock(type) as EmailColumnBlock])}
                >
                  <Plus className="h-3 w-3" />
                  {blockLabels[type]}
                </Button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const networks: { value: EmailSocialNetwork; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "youtube", label: "YouTube" },
  { value: "site", label: "Site" },
];

const SocialProperties: FC<Props<EmailSocialBlock>> = ({ block, onChange }) => (
  <>
    {block.links.map((link, index) => (
      <div key={index} className="flex items-end gap-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`social-${block.id}-${index}`}>Rede</Label>
          <select
            id={`social-${block.id}-${index}`}
            value={link.network}
            className={cn(crmSelectClassName, "w-32")}
            onChange={(event) =>
              onChange({
                ...block,
                links: block.links.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, network: event.target.value as EmailSocialNetwork } : item,
                ),
              })
            }
          >
            {networks.map((network) => (
              <option key={network.value} value={network.value}>
                {network.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          aria-label="Link da rede"
          value={link.url}
          className="min-w-0 flex-1"
          onChange={(event) =>
            onChange({
              ...block,
              links: block.links.map((item, itemIndex) => (itemIndex === index ? { ...item, url: event.target.value } : item)),
            })
          }
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Remover rede"
          onClick={() => onChange({ ...block, links: block.links.filter((_item, itemIndex) => itemIndex !== index) })}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ))}
    {block.links.length < 6 && (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="justify-self-start"
        onClick={() => onChange({ ...block, links: [...block.links, { network: "site", url: "https://" }] })}
      >
        <Plus className="h-3.5 w-3.5" />
        Adicionar rede
      </Button>
    )}
    <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
  </>
);

/** Propriedades do bloco selecionado. */
export const BlockProperties: FC<{ block: EmailBlock; onChange: (block: EmailBlock) => void }> = ({ block, onChange }) => {
  switch (block.type) {
    case "heading":
      return (
        <>
          <TextField id={`heading-${block.id}`} label="Texto" value={block.text} onChange={(text) => onChange({ ...block, text })} />
          <div className="grid gap-1.5">
            <Label htmlFor={`heading-level-${block.id}`}>Tamanho</Label>
            <select
              id={`heading-level-${block.id}`}
              value={block.level}
              className={crmSelectClassName}
              onChange={(event) => onChange({ ...block, level: Number(event.target.value) === 2 ? 2 : 1 })}
            >
              <option value={1}>Grande</option>
              <option value={2}>Médio</option>
            </select>
          </div>
          <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
        </>
      );
    case "text":
      return (
        <>
          <TextField
            id={`text-${block.id}`}
            label="Texto"
            multiline
            value={block.text}
            hint="**negrito**, _itálico_ e [texto do link](https://endereço). Cada linha vira uma quebra de linha."
            onChange={(text) => onChange({ ...block, text })}
          />
          <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
        </>
      );
    case "image":
      return <ImageProperties block={block} onChange={onChange} />;
    case "button":
      return (
        <>
          <TextField
            id={`button-${block.id}`}
            label="Texto do botão"
            value={block.text}
            onChange={(text) => onChange({ ...block, text })}
          />
          <UrlField id={`button-url-${block.id}`} label="Link" value={block.url} onChange={(url) => onChange({ ...block, url })} />
          <div className="grid gap-1.5">
            <Label htmlFor={`button-color-${block.id}`}>Cor</Label>
            <div className="flex items-center gap-2">
              <input
                id={`button-color-${block.id}`}
                type="color"
                value={block.color ?? "#1f2937"}
                onChange={(event) => onChange({ ...block, color: event.target.value })}
                className="h-9 w-12 cursor-pointer rounded border"
              />
              {block.color ? (
                <Button type="button" variant="link" size="sm" onClick={() => onChange({ ...block, color: null })}>
                  Usar a cor da marca
                </Button>
              ) : (
                <span className="text-muted-foreground text-xs">Usando a cor da marca</span>
              )}
            </div>
          </div>
          <AlignPicker value={block.align} onChange={(align) => onChange({ ...block, align })} />
        </>
      );
    case "spacer":
      return (
        <div className="grid gap-1.5">
          <Label htmlFor={`spacer-${block.id}`}>Altura: {block.height}px</Label>
          <input
            id={`spacer-${block.id}`}
            type="range"
            min={4}
            max={120}
            step={4}
            value={block.height}
            onChange={(event) => onChange({ ...block, height: Number(event.target.value) })}
          />
        </div>
      );
    case "columns":
      return <ColumnsProperties block={block} onChange={onChange} />;
    case "social":
      return <SocialProperties block={block} onChange={onChange} />;
    case "divider":
      return <p className="text-muted-foreground text-sm">Uma linha fina separando as partes do e-mail.</p>;
  }
};
