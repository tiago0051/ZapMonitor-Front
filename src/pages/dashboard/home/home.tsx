import type { FC } from "react";
import { HomeLink } from "./components/homeLink";
import { FaWhatsapp } from "react-icons/fa";
import { Header } from "@/components/ui/header";

export const HomePage: FC = () => {
  return (
    <>
      <Header title="Bem vindo" />
      <div>
        <HomeLink to={"/dashboard/whatsapp"} icon={FaWhatsapp}>
          WhatsApp
        </HomeLink>
      </div>
    </>
  );
};
