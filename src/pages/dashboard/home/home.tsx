import type { FC } from "react";
import { HomeLink } from "./components/homeLink";
import { FaWhatsapp } from "react-icons/fa";
import { Header } from "@/components/ui/header";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Reports } from "./reports/reports";

export const HomePage: FC = () => {
  const baseUrl = useBaseUrl();
  return (
    <>
      <Header title="Bem vindo" />
      <div>
        <HomeLink to={`${baseUrl}/whatsapp`} icon={FaWhatsapp}>
          WhatsApp
        </HomeLink>
      </div>

      <div>
        <Reports />
      </div>
    </>
  );
};
