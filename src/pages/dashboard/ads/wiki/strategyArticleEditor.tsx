import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { ownerService } from "@/services/api/ownerService";
import { strategyWikiService } from "@/services/api/strategyWikiService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import {
  slugify,
  STRATEGY_CATEGORIES,
  STRATEGY_CATEGORY_LABEL,
  STRATEGY_CHANNEL_LABEL,
  STRATEGY_CHANNELS,
  STRATEGY_PURPOSE_LABEL,
  STRATEGY_PURPOSES,
} from "./wikiUtils";

const textareaClassName =
  "border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none";

const EMPTY: StrategyArticleContent = {
  title: "",
  category: "CREATIVE",
  channels: [],
  segments: [],
  purposes: ["CHAT"],
  priority: 2,
  summary: "",
  guidance: [],
  body: "",
  keywords: [],
  sources: [],
};

const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const Field: FC<{ label: string; htmlFor?: string; hint?: string; children: ReactNode }> = ({ label, htmlFor, hint, children }) => (
  <div className="grid gap-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
  </div>
);

const CheckboxGroup = <T extends string>({
  legend,
  hint,
  options,
  selected,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (value: T[]) => void;
}) => (
  <fieldset className="grid gap-1.5">
    <legend className="text-sm font-medium">{legend}</legend>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <Checkbox checked={selected.includes(option.value)} onCheckedChange={() => onChange(toggle(selected, option.value))} />
          {option.label}
        </label>
      ))}
    </div>
    {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
  </fieldset>
);

/** Formulário do dono para criar ou editar um artigo (a edição de um padrão fica por cima do texto do sistema). */
export const StrategyArticleEditor: FC<{
  article: StrategyArticle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (article: StrategyArticle) => void;
}> = ({ article, open, onOpenChange, onSaved }) => {
  const queryClient = useQueryClient();
  const isNew = !article;
  const [form, setForm] = useState<StrategyArticleContent>(() => (article ? { ...article } : EMPTY));
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [guidanceText, setGuidanceText] = useState(article?.guidance.join("\n") ?? "");
  const [keywordsText, setKeywordsText] = useState(article?.keywords.join(", ") ?? "");
  const [sourcesText, setSourcesText] = useState(article?.sources.map((source) => `${source.title} | ${source.url}`).join("\n") ?? "");
  const set = <K extends keyof StrategyArticleContent>(key: K, value: StrategyArticleContent[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const segmentsQuery = useQuery({ queryKey: ["owner", "adSegments"], queryFn: ownerService.findAdSegments, enabled: open });

  const save = useMutation({
    mutationFn: (body: StrategyArticleContent) =>
      isNew
        ? strategyWikiService.create({ body: { ...body, slug } })
        : strategyWikiService.update({ params: { slug: article.slug }, body }),
    onSuccess: (saved) => {
      toast.success(isNew ? "Artigo criado" : "Artigo salvo");
      queryClient.invalidateQueries({ queryKey: ["strategyWiki"] });
      onSaved(saved);
      onOpenChange(false);
    },
    onError: requestErrorHandling,
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const sources = lines(sourcesText).map((line) => {
      const [title, url] = line.split("|").map((part) => part.trim());
      return { title: url ? title : title.substring(0, 200), url: url ?? title };
    });
    save.mutate({
      ...form,
      guidance: lines(guidanceText),
      keywords: keywordsText
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      sources,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Novo artigo da wiki" : "Editar artigo"}</DialogTitle>
          <DialogDescription>
            Vale para todos os clientes. As regras para a IA entram nos pedidos de análise, plano, criativos, vídeo e conversa conforme os
            usos marcados.
          </DialogDescription>
        </DialogHeader>

        <form id="strategy-article-form" onSubmit={handleSubmit} className="grid gap-4">
          <Field label="Título" htmlFor="wiki-title">
            <Input
              id="wiki-title"
              required
              minLength={3}
              maxLength={150}
              value={form.title}
              onChange={(event) => {
                set("title", event.target.value);
                if (isNew) setSlug(slugify(event.target.value));
              }}
            />
          </Field>

          {isNew && (
            <Field label="Endereço" htmlFor="wiki-slug" hint="Letras minúsculas, números e hífens. Não muda depois.">
              <Input
                id="wiki-slug"
                required
                maxLength={80}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Assunto" htmlFor="wiki-category">
              <select
                id="wiki-category"
                className={crmSelectClassName}
                value={form.category}
                onChange={(event) => set("category", event.target.value as StrategyCategory)}
              >
                {STRATEGY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {STRATEGY_CATEGORY_LABEL[category]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridade para a IA" htmlFor="wiki-priority" hint="Os essenciais entram primeiro quando falta espaço.">
              <select
                id="wiki-priority"
                className={crmSelectClassName}
                value={form.priority}
                onChange={(event) => set("priority", Number(event.target.value))}
              >
                <option value={1}>Essencial</option>
                <option value={2}>Importante</option>
                <option value={3}>Complementar</option>
              </select>
            </Field>
          </div>

          <CheckboxGroup
            legend="Canais"
            hint="Nenhum marcado = vale para todos."
            options={STRATEGY_CHANNELS.map((value) => ({ value, label: STRATEGY_CHANNEL_LABEL[value] }))}
            selected={form.channels}
            onChange={(value) => set("channels", value)}
          />

          <CheckboxGroup
            legend="Segmentos"
            hint="Nenhum marcado = vale para todos. Marcado, só entra para clientes desses segmentos."
            options={(segmentsQuery.data ?? []).map((segment) => ({ value: segment.value, label: segment.label }))}
            selected={form.segments}
            onChange={(value) => set("segments", value)}
          />

          <CheckboxGroup
            legend="Usado pela IA em"
            options={STRATEGY_PURPOSES.map((value) => ({ value, label: STRATEGY_PURPOSE_LABEL[value] }))}
            selected={form.purposes}
            onChange={(value) => set("purposes", value)}
          />

          <Field label="Resumo" htmlFor="wiki-summary">
            <textarea
              id="wiki-summary"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              className={textareaClassName}
              value={form.summary}
              onChange={(event) => set("summary", event.target.value)}
            />
          </Field>

          <Field label="Regras para a IA" htmlFor="wiki-guidance" hint="Uma por linha, até 8. É o que a IA segue ao criar e analisar.">
            <textarea
              id="wiki-guidance"
              rows={5}
              className={textareaClassName}
              value={guidanceText}
              onChange={(event) => setGuidanceText(event.target.value)}
            />
          </Field>

          <Field label="Texto do artigo" htmlFor="wiki-body" hint="Markdown: ## título, - lista, **negrito**, tabelas com |.">
            <textarea
              id="wiki-body"
              rows={14}
              maxLength={30000}
              className={`${textareaClassName} font-mono text-xs`}
              value={form.body}
              onChange={(event) => set("body", event.target.value)}
            />
          </Field>

          <Field label="Palavras-chave" htmlFor="wiki-keywords" hint="Separadas por vírgula; ajudam a conversa a achar o artigo.">
            <Input id="wiki-keywords" value={keywordsText} onChange={(event) => setKeywordsText(event.target.value)} />
          </Field>

          <Field label="Fontes" htmlFor="wiki-sources" hint="Uma por linha: Título | https://endereço">
            <textarea
              id="wiki-sources"
              rows={3}
              className={textareaClassName}
              value={sourcesText}
              onChange={(event) => setSourcesText(event.target.value)}
            />
          </Field>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="strategy-article-form" disabled={save.isPending || !form.purposes.length}>
            {save.isPending ? "Salvando…" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
