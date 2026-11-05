import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Paperclip, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { emptyBrandProfile, pilotTextareaClassName, profileListFields } from "./pilotUtils";

type Props = { account: AdAccount; brand: AdBrandProfile; onChange: (brand: AdBrandProfile) => void };

const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/** O que a IA precisa saber da empresa: texto livre, arquivos e o perfil que ela monta e o usuário revisa. */
export const PilotBrand: FC<Props> = ({ account, brand, onChange }) => {
  const { client, can } = useClientContext();
  const params = { clientId: client.id, accountId: account.id };
  const canManage = can("ads.manage");
  const fileInput = useRef<HTMLInputElement>(null);
  const [baseText, setBaseText] = useState(brand.baseText ?? "");
  const [profile, setProfile] = useState<AdBrandProfileData>(brand.profile ?? emptyBrandProfile());
  // As listas ficam como texto enquanto a pessoa edita, para não perder a linha em branco que ela acabou de abrir
  const [lists, setLists] = useState<Record<string, string>>(() =>
    Object.fromEntries(profileListFields.map(({ key }) => [key, toLines((brand.profile ?? emptyBrandProfile())[key] as string[])])),
  );

  const applyProfile = (updated: AdBrandProfile) => {
    onChange(updated);
    const next = updated.profile ?? emptyBrandProfile();
    setProfile(next);
    setLists(Object.fromEntries(profileListFields.map(({ key }) => [key, toLines(next[key] as string[])])));
  };

  const saveBase = useMutation({
    mutationFn: () => metaAdsService.saveBrandSettings({ params, body: { baseText: baseText.trim() || null } }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onChange(updated);
      toast.success("Base salva");
    },
  });
  const addSource = useMutation({
    mutationFn: (file: File) => metaAdsService.addBrandSource({ params, file }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onChange(updated);
      toast.success("Arquivo lido e guardado na base");
    },
  });
  const deleteSource = useMutation({
    mutationFn: (sourceId: string) => metaAdsService.deleteBrandSource({ params: { ...params, sourceId } }),
    onError: requestErrorHandling,
    onSuccess: onChange,
  });
  const generate = useMutation({
    mutationFn: async () => {
      if ((brand.baseText ?? "") !== baseText)
        await metaAdsService.saveBrandSettings({ params, body: { baseText: baseText.trim() || null } });
      return metaAdsService.generateBrandProfile({ params });
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      applyProfile(updated);
      toast.success("Perfil montado. Revise antes de usar.");
    },
  });
  const saveProfile = useMutation({
    mutationFn: () =>
      metaAdsService.saveBrandProfile({
        params,
        profile: { ...profile, ...Object.fromEntries(profileListFields.map(({ key }) => [key, fromLines(lists[key] ?? "")])) },
      }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      applyProfile(updated);
      toast.success("Perfil salvo");
    },
  });

  const isBusy = saveBase.isPending || addSource.isPending || generate.isPending || saveProfile.isPending;
  const hasBase = !!baseText.trim() || brand.sources.length > 0;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">1. Base da marca</h2>
        <p className="text-muted-foreground text-sm">
          Conte o que a empresa vende, para quem, as taxas e regras, os diferenciais e o que não pode ser prometido. Pode colar textos e
          enviar PDFs, tabelas ou imagens: a IA lê tudo e monta o perfil que guia campanhas e criativos.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="pilot-base" className="text-xs">
          Sobre a empresa
        </Label>
        <textarea
          id="pilot-base"
          className={pilotTextareaClassName}
          rows={6}
          maxLength={20000}
          disabled={!canManage}
          placeholder="Ex.: Somos correspondentes bancários em Curitiba, fazemos consignado INSS e cartão benefício. Atendemos aposentados de 55 a 75 anos pelo WhatsApp…"
          value={baseText}
          onChange={(event) => setBaseText(event.target.value)}
        />
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={isBusy || baseText === (brand.baseText ?? "")} onClick={() => saveBase.mutate()}>
              Salvar texto
            </Button>
            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => fileInput.current?.click()}>
              <Paperclip className="h-4 w-4" />
              {addSource.isPending ? "Lendo arquivo…" : "Enviar arquivo"}
            </Button>
            <input
              ref={fileInput}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.csv,.md,image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) addSource.mutate(file);
                event.target.value = "";
              }}
            />
            <span className="text-muted-foreground text-xs">PDF, imagem ou texto, até 15 MB</span>
          </div>
        )}
      </div>

      {brand.sources.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {brand.sources.map((source) => (
            <li key={source.id} className="flex items-start gap-3 p-3">
              <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{source.name}</p>
                <p className="text-muted-foreground line-clamp-2 text-xs">{source.preview}</p>
                <p className="text-muted-foreground text-[11px]">
                  {source.length.toLocaleString("pt-BR")} caracteres lidos · {format(new Date(source.createdAt), "dd/MM HH:mm")}
                </p>
              </div>
              {canManage && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Tirar ${source.name} da base`}
                  disabled={deleteSource.isPending}
                  onClick={() => deleteSource.mutate(source.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h3 className="font-medium">Perfil da marca</h3>
            <p className="text-muted-foreground text-xs">
              {brand.profileUpdatedAt
                ? `Atualizado em ${format(new Date(brand.profileUpdatedAt), "dd/MM/yyyy HH:mm")}. Ajuste o que não estiver certo.`
                : "A IA monta a partir da base, dos arquivos e das legendas que mais engajaram."}
            </p>
          </div>
          {canManage && (
            <Button size="sm" disabled={isBusy || !hasBase} onClick={() => generate.mutate()}>
              <Sparkles className="h-4 w-4" />
              {generate.isPending ? "Montando…" : brand.profile ? "Montar de novo" : "Montar perfil com IA"}
            </Button>
          )}
        </div>

        {brand.profile && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1 sm:col-span-2">
                <Label htmlFor="profile-business" className="text-xs">
                  O que a empresa faz
                </Label>
                <textarea
                  id="profile-business"
                  className={pilotTextareaClassName}
                  rows={2}
                  disabled={!canManage}
                  value={profile.business}
                  onChange={(event) => setProfile({ ...profile, business: event.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="profile-audience" className="text-xs">
                  Público
                </Label>
                <textarea
                  id="profile-audience"
                  className={pilotTextareaClassName}
                  rows={2}
                  disabled={!canManage}
                  value={profile.audience}
                  onChange={(event) => setProfile({ ...profile, audience: event.target.value })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="profile-tone" className="text-xs">
                  Tom de voz
                </Label>
                <Input
                  id="profile-tone"
                  disabled={!canManage}
                  value={profile.tone}
                  onChange={(event) => setProfile({ ...profile, tone: event.target.value })}
                />
              </div>
              {profileListFields.map(({ key, label }) => (
                <div key={key} className="grid gap-1">
                  <Label htmlFor={`profile-${key}`} className="text-xs">
                    {label} <span className="text-muted-foreground">(um por linha)</span>
                  </Label>
                  <textarea
                    id={`profile-${key}`}
                    className={pilotTextareaClassName}
                    rows={3}
                    disabled={!canManage}
                    value={lists[key] ?? ""}
                    onChange={(event) => setLists({ ...lists, [key]: event.target.value })}
                  />
                </div>
              ))}
            </div>
            {canManage && (
              <Button size="sm" variant="outline" disabled={isBusy} onClick={() => saveProfile.mutate()}>
                Salvar perfil
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  );
};
