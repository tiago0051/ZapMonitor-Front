import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmTextareaClassName } from "@/pages/dashboard/crm/crmUtils";
import { emailTemplateService } from "@/services/api/emailTemplateService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";

const ColorField: FC<{ id: string; label: string; value: string; onChange: (value: string) => void }> = ({
  id,
  label,
  value,
  onChange,
}) => (
  <div className="grid gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-12 cursor-pointer rounded border"
      />
      <Input id={id} value={value} maxLength={7} onChange={(event) => onChange(event.target.value)} className="w-28 font-mono" />
    </div>
  </div>
);

const BrandForm: FC<{ brand: EmailBrand }> = ({ brand }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [logo, setLogo] = useState({ assetId: brand.logoAssetId, url: brand.logoUrl });
  const [primaryColor, setPrimaryColor] = useState(brand.primaryColor);
  const [backgroundColor, setBackgroundColor] = useState(brand.backgroundColor);
  const [footerText, setFooterText] = useState(brand.footerText ?? "");
  const [uploading, setUploading] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      emailTemplateService.saveBrand(client.id, {
        logoAssetId: logo.assetId,
        primaryColor,
        backgroundColor,
        footerText: footerText.trim() || null,
      }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.setQueryData(["emailTemplates", "brand", client.id], saved);
      queryClient.invalidateQueries({ queryKey: ["emailTemplates", "preview"] });
      toast.success("Identidade visual salva");
    },
  });

  const applyIdentity = useMutation({
    mutationFn: () => emailTemplateService.applyBrandIdentity(client.id),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.setQueryData(["emailTemplates", "brand", client.id], saved);
      queryClient.invalidateQueries({ queryKey: ["emailTemplates", "preview"] });
      toast.success("Logo, cor e nome da marca aplicados nos e-mails");
    },
  });

  const upload = (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    emailTemplateService
      .uploadImage(client.id, file)
      .then(({ assetId, url }) => setLogo({ assetId, url }))
      .catch(requestErrorHandling)
      .finally(() => setUploading(false));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  const canEdit = can("templates.manage");

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {canEdit && (
        <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
          <span className="text-muted-foreground">
            Use a logo e as cores da identidade da marca, lida do Instagram e do Facebook e usada também nas postagens.
          </span>
          <Button type="button" variant="outline" size="sm" disabled={applyIdentity.isPending} onClick={() => applyIdentity.mutate()}>
            {applyIdentity.isPending ? "Aplicando..." : "Usar identidade da marca"}
          </Button>
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="brand-logo">Logo</Label>
        {logo.url && <img src={logo.url} alt="Logo" className="bg-muted max-h-16 max-w-48 rounded border object-contain p-1" />}
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="brand-logo"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            disabled={!canEdit || uploading}
            onChange={(event) => upload(event.target.files?.[0])}
            className="max-w-xs"
          />
          {logo.assetId && canEdit && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setLogo({ assetId: null, url: null })}>
              Tirar o logo
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">
          {uploading ? "Enviando..." : "Aparece no topo de todos os e-mails. PNG ou JPG, até 2 MB."}
        </p>
      </div>
      <div className="flex flex-wrap gap-6">
        <ColorField id="brand-primary" label="Cor principal (botões e links)" value={primaryColor} onChange={setPrimaryColor} />
        <ColorField id="brand-background" label="Cor de fundo" value={backgroundColor} onChange={setBackgroundColor} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="brand-footer">Rodapé</Label>
        <textarea
          id="brand-footer"
          value={footerText}
          maxLength={1000}
          placeholder={"Maxcred Ltda · CNPJ 00.000.000/0001-00\nRua Exemplo, 100 · Rio de Janeiro, RJ"}
          onChange={(event) => setFooterText(event.target.value)}
          className={crmTextareaClassName}
        />
        <p className="text-muted-foreground text-xs">
          Nome e endereço da empresa vão em todo e-mail de marketing, junto do link de descadastro (que o ZapMonitor acrescenta sozinho).
        </p>
      </div>
      {canEdit && (
        <Button type="submit" className="justify-self-start" disabled={save.isPending || uploading}>
          Salvar identidade visual
        </Button>
      )}
    </form>
  );
};

/** Logo, cores e rodapé usados em todos os modelos de e-mail. */
export const EmailBrandCard = () => {
  const { client } = useClientContext();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["emailTemplates", "brand", client.id],
    queryFn: () => emailTemplateService.findBrand(client.id),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade visual dos e-mails</CardTitle>
        <CardDescription>
          Vale para todos os modelos: logo no topo, cor dos botões e links, cor de fundo e o rodapé com os dados da empresa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading && <LoadingState label="Carregando..." />}
        {query.isError && (
          <ErrorState
            message="Não foi possível carregar a identidade visual."
            onRetry={() => query.refetch()}
            isRetrying={query.isFetching}
          />
        )}
        {query.data && <BrandForm key={JSON.stringify(query.data)} brand={query.data} />}
      </CardContent>
    </Card>
  );
};
