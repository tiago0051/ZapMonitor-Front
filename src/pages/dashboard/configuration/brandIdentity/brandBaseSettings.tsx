import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { socialTextareaClassName } from "@/pages/dashboard/posts/postsUtils";
import { brandIdentityService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FileText, Paperclip, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { emptyBrandProfile, profileListFields } from "./brandProfileUtils";

const MAX_ABOUT_CHARS = 20000;

const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const listsOf = (profile: AdBrandProfileData) =>
  Object.fromEntries(profileListFields.map(({ key }) => [key, toLines(profile[key] as string[])]));

/**
 * Base da marca do cliente: texto livre, arquivos e o perfil que a IA monta e o usuário revisa. Uma só para o sistema —
 * guia o piloto e as campanhas de anúncio, as postagens, os e-mails e o assistente.
 */
const BrandBaseForm: FC<{ brand: BrandIdentity }> = ({ brand }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canEdit = can("brand.manage");
  const fileInput = useRef<HTMLInputElement>(null);
  const [about, setAbout] = useState(brand.about ?? "");
  const [profile, setProfile] = useState<AdBrandProfileData>(brand.profile ?? emptyBrandProfile());
  // As listas ficam como texto enquanto a pessoa edita, para não perder a linha em branco que ela acabou de abrir
  const [lists, setLists] = useState<Record<string, string>>(() => listsOf(brand.profile ?? emptyBrandProfile()));

  const apply = (saved: BrandIdentity) => {
    queryClient.setQueryData(["brandIdentity", client.id], saved);
    // O piloto de anúncios lê a base daqui
    queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotBrand", client.id] });
  };
  const applyProfile = (saved: BrandIdentity) => {
    apply(saved);
    const next = saved.profile ?? emptyBrandProfile();
    setProfile(next);
    setLists(listsOf(next));
  };

  const saveAbout = () => brandIdentityService.update(client.id, { about: about.trim() });

  const saveBase = useMutation({
    mutationFn: saveAbout,
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      apply(saved);
      toast.success("Base salva");
    },
  });
  const addSource = useMutation({
    mutationFn: (file: File) => brandIdentityService.addSource(client.id, file),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      apply(saved);
      toast.success("Arquivo lido e guardado na base");
    },
  });
  const deleteSource = useMutation({
    mutationFn: (sourceId: string) => brandIdentityService.deleteSource(client.id, sourceId),
    onError: requestErrorHandling,
    onSuccess: apply,
  });
  const generate = useMutation({
    mutationFn: async () => {
      // O texto ainda não salvo também entra na montagem
      if ((brand.about ?? "") !== about) await saveAbout();
      return brandIdentityService.generateProfile(client.id);
    },
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      applyProfile(saved);
      toast.success("Perfil montado. Revise antes de usar.");
    },
  });
  const saveProfile = useMutation({
    mutationFn: () =>
      brandIdentityService.saveProfile(client.id, {
        ...profile,
        ...Object.fromEntries(profileListFields.map(({ key }) => [key, fromLines(lists[key] ?? "")])),
      }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      applyProfile(saved);
      toast.success("Perfil salvo");
    },
  });

  const isBusy = saveBase.isPending || addSource.isPending || generate.isPending || saveProfile.isPending;
  const hasBase = !!about.trim() || brand.files.length > 0;

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <Label htmlFor="brand-base">Sobre a empresa</Label>
        <textarea
          id="brand-base"
          className={socialTextareaClassName}
          rows={6}
          maxLength={MAX_ABOUT_CHARS}
          disabled={!canEdit}
          placeholder="Ex.: Somos correspondentes bancários em Curitiba, fazemos consignado INSS e cartão benefício. Atendemos aposentados de 55 a 75 anos pelo WhatsApp. Tom próximo e respeitoso…"
          value={about}
          onChange={(event) => setAbout(event.target.value)}
        />
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={isBusy || about === (brand.about ?? "")} onClick={() => saveBase.mutate()}>
              {saveBase.isPending ? "Salvando..." : "Salvar texto"}
            </Button>
            <Button size="sm" variant="outline" disabled={isBusy} onClick={() => fileInput.current?.click()}>
              <Paperclip className="h-4 w-4" aria-hidden />
              {addSource.isPending ? "Lendo arquivo..." : "Enviar arquivo"}
            </Button>
            <input
              ref={fileInput}
              type="file"
              hidden
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

        {brand.files.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {brand.files.map((source) => (
              <li key={source.id} className="flex items-start gap-3 p-3">
                <FileText className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{source.name}</p>
                  <p className="text-muted-foreground line-clamp-2 text-xs">{source.preview}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {source.length.toLocaleString("pt-BR")} caracteres lidos · {format(new Date(source.createdAt), "dd/MM HH:mm")}
                  </p>
                </div>
                {canEdit && (
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
      </section>

      <section className="grid gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto">
            <h3 className="font-medium">Perfil da marca</h3>
            <p className="text-muted-foreground text-xs">
              {brand.profileUpdatedAt
                ? `Atualizado em ${format(new Date(brand.profileUpdatedAt), "dd/MM/yyyy HH:mm")}. Ajuste o que não estiver certo.`
                : "A IA monta a partir do texto, dos arquivos e das legendas que mais engajaram."}
            </p>
          </div>
          {canEdit && (
            <Button size="sm" disabled={isBusy || !hasBase} onClick={() => generate.mutate()}>
              <Sparkles className="h-4 w-4" aria-hidden />
              {generate.isPending ? "Montando..." : brand.profile ? "Montar de novo" : "Montar perfil com IA"}
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
                  className={socialTextareaClassName}
                  rows={2}
                  disabled={!canEdit}
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
                  className={socialTextareaClassName}
                  rows={2}
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                    className={socialTextareaClassName}
                    rows={3}
                    disabled={!canEdit}
                    value={lists[key] ?? ""}
                    onChange={(event) => setLists({ ...lists, [key]: event.target.value })}
                  />
                </div>
              ))}
            </div>
            {canEdit && (
              <Button size="sm" variant="outline" className="justify-self-start" disabled={isBusy} onClick={() => saveProfile.mutate()}>
                {saveProfile.isPending ? "Salvando..." : "Salvar perfil"}
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
};

/** Card da base da marca nas configurações; recebe a marca já carregada pela tela de identidade. */
export const BrandBaseSettings: FC<{ brand: BrandIdentity }> = ({ brand }) => (
  <Card>
    <CardHeader>
      <CardTitle>Base da marca</CardTitle>
      <CardDescription>
        Conte o que a empresa vende, para quem, as taxas e regras, os diferenciais e o que não pode ser prometido. Pode colar textos e
        enviar PDFs, tabelas ou imagens: a IA lê tudo e monta o perfil que guia o piloto e as campanhas de anúncio, as postagens, os e-mails
        e o assistente.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <BrandBaseForm key={brand.profileUpdatedAt ?? "sem-perfil"} brand={brand} />
    </CardContent>
  </Card>
);
