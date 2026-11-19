import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { AdsAssetLibrary } from "../campaign/adsAssetLibrary";

export type AdCreativeEditTarget = { kind: "add"; adSet: MetaAdSet } | { kind: "replace"; adSet: MetaAdSet; ad: MetaAd };

const textareaClassName =
  "border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 focus-visible:border-ring min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px]";

const replaceModes: { value: AdCreativeReplaceMode; label: string; hint: string }[] = [
  {
    value: "NEW_AD",
    label: "Anúncio novo e pausar o atual (recomendado)",
    hint: "O atual fica pausado com os resultados dele, e dá para comparar os dois. O novo nasce com o status do atual.",
  },
  {
    value: "SWAP",
    label: "Trocar no próprio anúncio",
    hint: "Mantém o mesmo anúncio, mas a Meta revisa de novo e o aprendizado recomeça.",
  },
];

/**
 * Adiciona um anúncio num conjunto publicado ou troca a mídia e os textos de um anúncio. Página, Instagram, botão e destino
 * vêm do anúncio modelo; o usuário escolhe a imagem ou o vídeo na biblioteca (ou cria no estúdio) e revisa os textos.
 */
export const AdCreativeEditDialog: FC<{
  account: AdAccount;
  target: AdCreativeEditTarget | null;
  onOpenChange: (open: boolean) => void;
}> = ({ account, target, onOpenChange }) => {
  const isReplace = target?.kind === "replace";

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isReplace ? "Trocar criativo" : "Adicionar anúncio"}</DialogTitle>
          <DialogDescription>
            {target?.kind === "replace"
              ? `Escolha a nova imagem ou vídeo de "${target.ad.name}" e revise os textos.`
              : `Novo anúncio no conjunto "${target?.adSet.name ?? ""}". Página, Instagram, botão e destino seguem o anúncio modelo.`}
          </DialogDescription>
        </DialogHeader>
        {/* A chave recomeça o formulário a cada anúncio ou conjunto aberto */}
        {target && (
          <TemplateLoader
            key={`${target.kind}-${target.adSet.metaId}-${target.kind === "replace" ? target.ad.metaId : ""}`}
            account={account}
            target={target}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Lê o anúncio modelo antes de montar o formulário, que já abre com os textos dele. */
const TemplateLoader: FC<{ account: AdAccount; target: AdCreativeEditTarget; onClose: () => void }> = ({ account, target, onClose }) => {
  const { client } = useClientContext();
  const templateQuery = useQuery({
    queryKey: ["metaAds", "adTemplate", client.id, account.id, target.adSet.metaId, target.kind === "replace" ? target.ad.metaId : null],
    queryFn: () =>
      metaAdsService.findAdTemplate({
        params: { clientId: client.id, accountId: account.id },
        metaAdSetId: target.adSet.metaId,
        metaAdId: target.kind === "replace" ? target.ad.metaId : undefined,
      }),
  });

  if (templateQuery.isLoading) return <LoadingState label="Lendo o anúncio..." />;
  if (templateQuery.isError || !templateQuery.data)
    return <p className="text-sm text-red-700 dark:text-red-300">Não foi possível ler o anúncio. Sincronize a conta e tente de novo.</p>;
  if (!templateQuery.data.canCreate)
    return (
      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        {templateQuery.data.reason}
      </p>
    );

  return <EditForm account={account} target={target} template={templateQuery.data} onClose={onClose} />;
};

const EditForm: FC<{ account: AdAccount; target: AdCreativeEditTarget; template: AdTemplate; onClose: () => void }> = ({
  account,
  target,
  template,
  onClose,
}) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const isReplace = target.kind === "replace";
  const assetsQuery = useQuery({
    queryKey: ["metaAds", "assets", client.id, account.id],
    queryFn: () => metaAdsService.findAssets({ params }),
  });

  const [assetId, setAssetId] = useState<string | null>(null);
  const [texts, setTexts] = useState<AdCreativeTexts>({
    primaryText: template.texts.primaryText,
    headline: template.texts.headline,
    description: template.texts.description,
    welcomeMessage: template.texts.welcomeMessage,
  });
  const [name, setName] = useState("");
  const [activate, setActivate] = useState(false);
  const [mode, setMode] = useState<AdCreativeReplaceMode>("NEW_AD");

  const save = useMutation({
    mutationFn: () => {
      // Boas-vindas igual à do modelo vai vazia: o servidor mantém a original, com o formato que ela tiver
      const welcomeMessage =
        texts.welcomeMessage?.trim() && texts.welcomeMessage !== template.texts.welcomeMessage ? texts.welcomeMessage : null;
      const body = { ...texts, welcomeMessage, assetId: assetId!, name: name.trim() || undefined };
      if (target.kind === "replace")
        return metaAdsService.replaceAdCreative({ params, metaAdId: target.ad.metaId, body: { ...body, mode } });
      return metaAdsService.addAdToAdSet({
        params,
        metaAdSetId: target.adSet.metaId,
        body: { ...body, activate, templateAdId: template.templateAdId ?? undefined },
      });
    },
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      toast.success(
        isReplace
          ? mode === "NEW_AD"
            ? "Anúncio novo criado e o anterior pausado"
            : "Criativo trocado; a Meta vai revisar o anúncio"
          : activate
            ? "Anúncio criado e ativado"
            : "Anúncio criado pausado; ative quando quiser",
        { description: "A tabela atualiza depois da sincronização com a Meta." },
      );
      onClose();
    },
  });

  const setText = (field: keyof AdCreativeTexts, value: string) => setTexts((current) => ({ ...current, [field]: value }));
  const canSave = !!assetId && !!texts.primaryText.trim() && !!texts.headline.trim() && !save.isPending;

  return (
    <>
      <div className="grid gap-4">
        {template.templateAdName && !isReplace && <p className="text-muted-foreground text-xs">Modelo: {template.templateAdName}</p>}

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Imagem ou vídeo</span>
          <AdsAssetLibrary
            account={account}
            assets={assetsQuery.data ?? []}
            selectedId={assetId}
            onSelect={(asset) => setAssetId(asset.id)}
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="ad-edit-primary">Texto principal</Label>
          <textarea
            id="ad-edit-primary"
            value={texts.primaryText}
            maxLength={2000}
            onChange={(event) => setText("primaryText", event.target.value)}
            className={textareaClassName}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="ad-edit-headline">Título</Label>
            <Input
              id="ad-edit-headline"
              value={texts.headline}
              maxLength={255}
              onChange={(event) => setText("headline", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ad-edit-description">Descrição (opcional)</Label>
            <Input
              id="ad-edit-description"
              value={texts.description ?? ""}
              maxLength={255}
              onChange={(event) => setText("description", event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ad-edit-welcome">Mensagem que abre a conversa no WhatsApp</Label>
          <Input
            id="ad-edit-welcome"
            value={texts.welcomeMessage ?? ""}
            maxLength={500}
            placeholder="Vazia mantém a do anúncio atual"
            onChange={(event) => setText("welcomeMessage", event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="ad-edit-name">Nome do anúncio (opcional)</Label>
          <Input
            id="ad-edit-name"
            value={name}
            maxLength={200}
            placeholder={
              target.kind === "replace" ? (mode === "SWAP" ? target.ad.name : `${target.ad.name} - troca`) : "Gerado a partir do modelo"
            }
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        {isReplace ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Como trocar</legend>
            {replaceModes.map((option) => (
              <label
                key={option.value}
                className={cn(
                  "grid cursor-pointer gap-0.5 rounded-lg border p-3 text-sm",
                  mode === option.value ? "border-primary bg-primary/5" : "hover:bg-accent/40",
                )}
              >
                <span className="flex items-center gap-2 font-medium">
                  <input type="radio" name="replace-mode" checked={mode === option.value} onChange={() => setMode(option.value)} />
                  {option.label}
                </span>
                <span className="text-muted-foreground text-xs">{option.hint}</span>
              </label>
            ))}
          </fieldset>
        ) : (
          <label className="flex items-start gap-3 rounded-lg border p-3 text-sm">
            <Switch checked={activate} onCheckedChange={setActivate} className="mt-0.5" />
            <span className="grid gap-0.5">
              <span className="font-medium">Ativar na hora</span>
              <span className="text-muted-foreground text-xs">
                Desligado, o anúncio nasce pausado para você revisar. Ativar respeita o horário das travas.
              </span>
            </span>
          </label>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button disabled={!canSave} onClick={() => save.mutate()}>
          {save.isPending ? "Enviando para a Meta..." : isReplace ? "Trocar criativo" : "Criar anúncio"}
        </Button>
      </DialogFooter>
    </>
  );
};
