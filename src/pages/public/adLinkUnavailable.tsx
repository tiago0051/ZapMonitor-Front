import { LinkIcon } from "lucide-react";
import { type FC, useEffect } from "react";
import { PublicMessage } from "./publicMessage";

/** Destino do link rastreado de anúncio (/r/:code) quando ele não está mais ativo. */
export const AdLinkUnavailable: FC = () => {
  useEffect(() => {
    document.title = "Link indisponível";
  }, []);

  return (
    <PublicMessage icon={LinkIcon} title="Link indisponível">
      Este link não está mais ativo. Procure a empresa pelos canais oficiais.
    </PublicMessage>
  );
};
