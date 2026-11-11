import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

const copyText = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error("Não foi possível copiar; selecione o texto e copie manualmente");
  }
};

const HELP: Record<"GOOGLE" | "TIKTOK", string> = {
  GOOGLE:
    "Cole o endereço como URL final do anúncio no Google Ads, com a codificação automática (gclid) ligada. Quem clica cai no WhatsApp com um código na mensagem, e a conversa entra no CRM com o anúncio de origem.",
  TIKTOK:
    "Anúncio com site de destino: cole o endereço como URL do anúncio. Anúncio de mensagem para o WhatsApp: use o texto pronto como mensagem inicial; o código dele identifica a campanha.",
};

/** Links rastreados que ligam o clique no anúncio do YouTube ou do TikTok à conversa no WhatsApp. */
export const AdTrackedLinks: FC<{ platform: "GOOGLE" | "TIKTOK" }> = ({ platform }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", whatsappConfigurationId: "", message: "Olá! Vi o anúncio e quero saber mais" });

  const linksQuery = useQuery({
    queryKey: ["metaAds", "platform", platform, "links", client.id],
    queryFn: () => adsPlatformService.findLinks({ params: { clientId: client.id, platform } }),
  });
  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id, "ads"],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
  });
  const configurations = configurationsQuery.data?.items ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metaAds", "platform", platform, "links"] });
  const createLink = useMutation({
    mutationFn: adsPlatformService.createLink,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      setForm((value) => ({ ...value, name: "" }));
      toast.success("Link criado. Copie e cole no anúncio.");
    },
  });
  const updateLink = useMutation({ mutationFn: adsPlatformService.updateLink, onError: requestErrorHandling, onSuccess: invalidate });
  const deleteLink = useMutation({ mutationFn: adsPlatformService.deleteLink, onError: requestErrorHandling, onSuccess: invalidate });

  const canCreate = form.name.trim() && form.whatsappConfigurationId && form.message.trim() && !createLink.isPending;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Links para os anúncios</h3>
        <p className="text-muted-foreground text-xs">{HELP[platform]}</p>
      </div>

      <form
        className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_12rem]"
        onSubmit={(event) => {
          event.preventDefault();
          if (canCreate) createLink.mutate({ params: { clientId: client.id, platform }, body: form });
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor={`link-name-${platform}`} className="text-xs">
            Nome do link
          </Label>
          <Input
            id={`link-name-${platform}`}
            value={form.name}
            placeholder="Ex.: Campanha crédito novembro"
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`link-number-${platform}`} className="text-xs">
            Número de WhatsApp
          </Label>
          <select
            id={`link-number-${platform}`}
            className={crmSelectClassName}
            value={form.whatsappConfigurationId}
            onChange={(event) => setForm({ ...form, whatsappConfigurationId: event.target.value })}
          >
            <option value="">Escolha</option>
            {configurations.map((configuration) => (
              <option key={configuration.id} value={configuration.id}>
                {configuration.phoneNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor={`link-message-${platform}`} className="text-xs">
            Mensagem que abre pronta no WhatsApp (o código entra no fim)
          </Label>
          <Input
            id={`link-message-${platform}`}
            value={form.message}
            onChange={(event) => setForm({ ...form, message: event.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={!canCreate}>
            Criar link
          </Button>
        </div>
      </form>

      {(linksQuery.data ?? []).length > 0 && (
        <ul className="divide-y rounded-lg border">
          {linksQuery.data!.map((link) => (
            <li key={link.id} className="space-y-2 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{link.name}</p>
                {link.externalAdId && <Badge variant="secondary">Criado com o anúncio</Badge>}
                <span className="text-muted-foreground text-xs tabular-nums">
                  {link.clicks} clique(s) · {link.conversations} conversa(s)
                </span>
                <Switch
                  aria-label={link.active ? `Desativar ${link.name}` : `Ativar ${link.name}`}
                  checked={link.active}
                  onCheckedChange={(active) => updateLink.mutate({ params: { clientId: client.id, linkId: link.id }, body: { active } })}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={`Apagar ${link.name}`}
                  disabled={deleteLink.isPending}
                  onClick={() => deleteLink.mutate({ params: { clientId: client.id, linkId: link.id } })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 text-xs select-all">{link.url}</code>
                <Button size="sm" variant="outline" onClick={() => copyText(link.url, "Endereço")}>
                  <Copy className="h-4 w-4" />
                  Copiar
                </Button>
              </div>
              {platform === "TIKTOK" && (
                <div className="flex items-center gap-2">
                  <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 text-xs select-all">{link.prefilledMessage}</code>
                  <Button size="sm" variant="outline" onClick={() => copyText(link.prefilledMessage, "Texto pronto")}>
                    <Copy className="h-4 w-4" />
                    Copiar texto
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
