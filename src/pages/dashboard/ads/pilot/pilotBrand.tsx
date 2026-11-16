import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { format } from "date-fns";
import { Settings } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";

type Props = { brand: AdBrandProfile };

/** A base e o perfil da marca são editados nas configurações (valem para todo o sistema); aqui o piloto só mostra o que vai usar. */
export const PilotBrand: FC<Props> = ({ brand }) => {
  const { can } = useClientContext();
  const baseUrl = useBaseUrl();
  const profile = brand.profile;
  const hasBase = !!profile || !!brand.baseText?.trim();

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="mr-auto">
          <h2 className="text-lg font-semibold">1. Base da marca</h2>
          <p className="text-muted-foreground text-sm">
            O que a empresa vende, para quem e o que não pode ser prometido. Fica em Configurações › Identidade da marca, junto da
            identidade visual, e vale para anúncios, postagens, e-mails e o assistente.
          </p>
        </div>
        {can("brand.manage") && (
          <Button asChild size="sm" variant="outline">
            <Link to={`${baseUrl}/configuration?tab=brandIdentity`}>
              <Settings className="h-4 w-4" aria-hidden />
              {hasBase ? "Editar nas configurações" : "Preencher nas configurações"}
            </Link>
          </Button>
        )}
      </div>

      {profile ? (
        <dl className="grid gap-3 rounded-lg border p-4 text-sm sm:grid-cols-2">
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground text-xs">O que a empresa faz</dt>
            <dd>{profile.business || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Público</dt>
            <dd>{profile.audience || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Tom de voz</dt>
            <dd>{profile.tone || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Produtos</dt>
            <dd>{profile.products.join(" · ") || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Restrições</dt>
            <dd>{profile.restrictions.join(" · ") || "—"}</dd>
          </div>
          {brand.profileUpdatedAt && (
            <p className="text-muted-foreground text-xs sm:col-span-2">
              Perfil atualizado em {format(new Date(brand.profileUpdatedAt), "dd/MM/yyyy HH:mm")}
            </p>
          )}
        </dl>
      ) : (
        <p className="text-muted-foreground rounded-lg border border-dashed p-4 text-sm">
          {hasBase
            ? "A base está escrita, mas o perfil ainda não foi montado. O piloto monta com a IA na primeira campanha, ou você pode montar e revisar nas configurações."
            : "Nenhuma base preenchida ainda. Sem ela o piloto não monta campanhas."}
        </p>
      )}
    </section>
  );
};
